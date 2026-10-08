/** Initials preserve author credits without impersonating authors with stock portraits. */
export function AuthorAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center rounded-full bg-[var(--background-secondary)] text-[var(--brand-primary)] font-semibold ${large ? 'h-11 w-11 text-sm' : 'h-7 w-7 text-[10px]'}`}>{name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span>;
}
