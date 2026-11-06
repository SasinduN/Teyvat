import { CarTaxiFront } from 'lucide-react';
import { paths } from '@shared/site-paths';
import { SiteLink } from './SiteLink';

/** Navigation only: FloatingActions owns where the stack sits and when the labels show. */
export function FloatingBookingCTA({ hidden = false }: { hidden?: boolean }) {
  return (
    <SiteLink to={paths.booking} className="te-floating-booking"
      data-floating-booking data-state={hidden ? 'hidden' : 'shown'}
      inert={hidden} aria-hidden={hidden || undefined} tabIndex={hidden ? -1 : undefined}
      aria-label="Book a ride">
      <span className="te-floating-label" aria-hidden="true">Book a ride</span>
      <CarTaxiFront aria-hidden="true" />
    </SiteLink>
  );
}
