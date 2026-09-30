/**
 * Turning a thrown value into a message a person can read.
 *
 * The API writes its error messages for people (`ApiRequestError.message`),
 * so this mostly passes them through.
 */
export function describeError(error: unknown): string {
  if (!error) return 'Something went wrong.';
  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const e = error as { message?: string };
    if (e.message) return e.message;
  }

  return 'Something went wrong.';
}
