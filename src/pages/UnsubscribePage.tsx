import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailX } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useHeroSlides } from '@/hooks/useSiteContent';
import { postJson } from '@/lib/api/http';
import { describeError } from '@/lib/errors';
import { API_ROUTES } from '@shared/api';
import { PAGE_TITLES } from '@shared/page-meta';
import { paths, UNSUBSCRIBE_TOKEN_PATTERN } from '@shared/site-paths';

/**
 * `/unsubscribe?token=…`: the link in every newsletter email
 * (`newsletterUnsubscribeUrl`). Opening it changes nothing; the button does,
 * so a mail scanner following the link can't unsubscribe anyone. Not linked
 * from the site, and `noindex` (server/src/pages/pages.ts).
 */
export function UnsubscribePage() {
  usePageTitle(PAGE_TITLES.unsubscribe);
  const slides = useHeroSlides();
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const valid = UNSUBSCRIBE_TOKEN_PATTERN.test(token);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const unsubscribe = async () => {
    setState('sending');
    setError(null);
    try {
      await postJson(API_ROUTES.newsletterUnsubscribe, { token });
      setState('done');
    } catch (e) {
      setError(describeError(e));
      setState('idle');
    }
  };

  return (
    <>
      <PageHero
        compact
        image={slides[0]?.url}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Unsubscribe' }]}
        eyebrow="Newsletter"
        title="Unsubscribe"
      />

      <section className="bg-[var(--background)] py-16 sm:py-20" data-unsubscribe>
        <div className="mx-auto max-w-xl space-y-6 px-4 text-center sm:px-6">
          {state === 'done' ? (
            <p role="status" className="flex items-center justify-center gap-2 text-lg text-[var(--brand-primary)]">
              <CheckCircle2 className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
              You’re unsubscribed. We won’t email you again.
            </p>
          ) : valid ? (
            <>
              <p className="font-light text-[var(--text-primary)]/75">
                Press the button to stop receiving our newsletter. Your email address is deleted, not just paused.
              </p>
              <button
                type="button"
                onClick={() => void unsubscribe()}
                disabled={state === 'sending'}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--inverse-surface)] px-8 py-3.5 font-bold text-white transition-colors hover:bg-[var(--brand-secondary)] disabled:opacity-60"
              >
                <MailX className="h-5 w-5" aria-hidden="true" />
                {state === 'sending' ? 'Unsubscribing…' : 'Unsubscribe'}
              </button>
              {error && (
                <p role="alert" className="text-sm text-[var(--danger)]">
                  {error}
                </p>
              )}
            </>
          ) : (
            <p className="font-light text-[var(--text-primary)]/75">
              This unsubscribe link is incomplete. Open the link from the newsletter email again, or{' '}
              <Link to={paths.contact} className="text-[var(--brand-primary)] underline underline-offset-2">
                contact us
              </Link>{' '}
              and we’ll remove your address.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
