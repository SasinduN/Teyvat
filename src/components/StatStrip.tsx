import { useSiteSettings } from '@/hooks/useSiteContent';
import { formatStat, visibleStats } from '@shared/site-stats';

/**
 * The numbers from Admin → Settings: plain type between two hairlines, with no
 * icons and no counting up. With none, it isn't there at all.
 */
export function StatStrip() {
  const stats = visibleStats(useSiteSettings().stats);
  if (stats.length === 0) return null;
  return (
    <section className="te-stats" aria-label="Sri Lanka in numbers" data-stat-strip>
      <div className="te-container">
        <dl className="te-stats__list">
          {stats.map((stat) => (
            <div key={`${stat.order}-${stat.label}`} className="te-stats__item">
              <dt className="te-stats__label">{stat.label}</dt>
              <dd className="te-stats__value">{formatStat(stat)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
