import photographs from '@shared/travel-photos.json';
import { PageHero } from '@/components/PageHero';
import { usePageTitle } from '@/context/PublicSiteContext';

export function PhotoCreditsPage() {
  usePageTitle('Photography credits | Travel Eye');
  return <>
    <PageHero compact title="Photography credits" eyebrow="The people behind the photographs" crumbs={[{ label: 'Home', to: '/' }, { label: 'Photography credits' }]} />
    <section className="te-container">
      <p className="max-w-2xl mb-8 text-[var(--text-secondary)]">Our curated location photographs are credited below. Images are resized by Wikimedia and may be cropped in their display containers. Each photograph retains its listed license, including share-alike terms where applicable.</p>
      <ul className="grid gap-4 md:grid-cols-2">
        {photographs.map(photo => <li key={photo.key} className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] min-w-0">
          <a className="font-heading font-semibold text-[var(--brand-primary)] underline underline-offset-4 break-words" href={photo.source} target="_blank" rel="noopener noreferrer">{photo.file}</a>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{photo.author}</p>
          <a className="inline-block mt-2 text-xs underline underline-offset-4" href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a>
        </li>)}
      </ul>
    </section>
  </>;
}
