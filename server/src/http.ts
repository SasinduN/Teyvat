/**
 * Small HTTP helpers, so every route reports success and failure the same way.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { ApiErrorCode, ApiErrorPayload } from '../../shared/api';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  internal: 500
};

/**
 * An error a route raises on purpose, carrying the status and the message the
 * client should see. Anything else that escapes a handler is a bug and becomes
 * a generic 500 — deliberately, so an unexpected failure cannot leak a stack
 * trace or a SQL string to the browser.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function sendError(res: Response, code: ApiErrorCode, message: string): void {
  const body: ApiErrorPayload = { error: { code, message } };
  res.status(STATUS_BY_CODE[code]).json(body);
}

/**
 * Express 5 forwards a rejected promise to the error handler on its own, but
 * only for handlers it recognises as returning one. Wrapping is explicit and
 * survives a downgrade, and it costs nothing.
 */
export function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

/** Terminal error handler. Must keep all four parameters to be recognised. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    sendError(res, error.code, error.message);
    return;
  }

  // Log the real thing; return something that says nothing about internals.
  console.error('[api] unhandled error:', error);
  sendError(res, 'internal', 'Something went wrong.');
}
