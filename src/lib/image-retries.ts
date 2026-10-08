/** Retry the saved photo after a responsive candidate fails, then its credited original. */
export function imageRetries(src: string | undefined, responsive: string | undefined, original: string | undefined): string[] {
  const retries: string[] = [];
  if (responsive && src) retries.push(src);
  if (original && original !== src) retries.push(original);
  return retries;
}
