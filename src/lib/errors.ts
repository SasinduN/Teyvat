/**
 * Turning a thrown value into a message a person can read.
 *
 * Its own module, free of any SDK import, because the public `InquiryModal`
 * uses it and must not pull the Supabase client into the marketing site's
 * bundle.
 */

/**
 * Normalises an `ApiRequestError`, a PostgrestError or any other throw into a
 * user-facing message.
 */
export function describeError(error: unknown): string {
  if (!error) return 'Something went wrong.';
  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const e = error as { message?: string; details?: string; code?: string };

    // RLS rejections surface as 42501 and are otherwise cryptic.
    if (e.code === '42501') {
      return 'You do not have permission to perform this action.';
    }
    if (e.code === '23505') {
      return 'That ID is already taken. Choose a different slug.';
    }
    if (e.message) return e.message;
    if (e.details) return e.details;
  }

  return 'Something went wrong.';
}
