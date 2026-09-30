/**
 * Small HTTP helpers, so every route reports success and failure the same way.
 */
import { isIP } from 'node:net';

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
 * The caller's address as Railway's proxy saw it. `trust proxy` is 1, so this
 * is the right-most `X-Forwarded-For` entry, the one the proxy appended. If it
 * is somehow not an address `inet` accepts, fall back to the socket. Used by
 * both rate limits (sign-in and the enquiry form).
 */
export function clientIp(req: Request): string {
  if (req.ip && isIP(req.ip)) return req.ip;
  return req.socket.remoteAddress ?? '0.0.0.0';
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

/**
 * One line for the log that can't carry personal data.
 *
 * Error objects are never logged whole. A Postgres error's `detail` repeats
 * the failing row ("Failing row contains (Jane, jane@…, …)"), and its
 * message can quote a value that failed a cast. A JSON parse error's message
 * quotes the request body. So a database error is logged by its code and the
 * names of what it hit; anything else by name and message; and the stack
 * without its first line, which repeats the message.
 */
export function describeForLog(error: unknown): string {
  if (!(error instanceof Error)) return `non-Error thrown (${typeof error})`;

  const e = error as Error & {
    code?: string;
    severity?: string;
    constraint?: string;
    table?: string;
    column?: string;
    routine?: string;
  };
  const frames = (e.stack ?? '').split('\n').slice(1).join('\n');

  if (e.severity && e.code) {
    const where = [
      e.table && `table ${e.table}`,
      e.column && `column ${e.column}`,
      e.constraint && `constraint ${e.constraint}`,
      e.routine && `routine ${e.routine}`
    ]
      .filter(Boolean)
      .join(', ');
    return `database error ${e.code}${where ? ` (${where})` : ''}\n${frames}`;
  }

  return `${e.name}: ${e.message}\n${frames}`;
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

  const parserError = error as { type?: string; status?: number };

  // body-parser's own limit (the media route's 10 MB, everywhere else 100 kB).
  if (parserError.type === 'entity.too.large') {
    sendError(res, 'payload_too_large', 'That is too large to upload.');
    return;
  }

  // Malformed JSON and other bad bodies are the client's mistake, not ours.
  // Not logged: the parse error's message quotes the body.
  if (parserError.type && parserError.status && parserError.status >= 400 && parserError.status < 500) {
    sendError(res, 'bad_request', 'The request body could not be read.');
    return;
  }

  // Log what happened; return something that says nothing about internals.
  console.error(`[api] unhandled error: ${describeForLog(error)}`);
  sendError(res, 'internal', 'Something went wrong.');
}
