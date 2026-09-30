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
  too_many_requests: 429,
  payload_too_large: 413,
  unsupported_media_type: 415,
  internal: 500,
  bad_gateway: 502,
  not_configured: 503
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
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function sendError(
  res: Response,
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>
): void {
  const body: ApiErrorPayload = { error: { code, message, ...(fields ? { fields } : {}) } };
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
    sendError(res, error.code, error.message, error.fields);
    return;
  }

  // body-parser's own limit (the media route's 10 MB, everywhere else 100 kB).
  if ((error as { type?: string }).type === 'entity.too.large') {
    sendError(res, 'payload_too_large', 'That is too large to upload.');
    return;
  }

  // Log the real thing; return something that says nothing about internals.
  console.error('[api] unhandled error:', error);
  sendError(res, 'internal', 'Something went wrong.');
}
