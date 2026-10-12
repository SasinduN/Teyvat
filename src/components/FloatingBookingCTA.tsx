import { forwardRef } from 'react';
import { Car, ArrowRight } from 'lucide-react';
import { paths } from '@shared/site-paths';
import { SiteLink } from './SiteLink';

/** Navigation only: the shared stack owns responsive positioning and collision handling. */
export const FloatingBookingCTA = forwardRef<HTMLAnchorElement, { hidden?: boolean }>(
  ({ hidden = false }, ref) => (
    <SiteLink ref={ref} to={paths.booking} className="te-floating-booking"
      data-floating-booking data-visible={!hidden} data-state={hidden ? 'hidden' : 'shown'}
      inert={hidden} aria-hidden={hidden || undefined} tabIndex={hidden ? -1 : undefined}
      aria-label="Book Your Ride - open Book a Trip">
      <Car size={20} aria-hidden="true" />
      <span className="te-floating-booking-label">Book Your Ride</span>
      <span className="te-floating-booking-compact">Book Now</span>
      <ArrowRight className="te-floating-booking-arrow" size={16} aria-hidden="true" />
    </SiteLink>
  )
);
FloatingBookingCTA.displayName = 'FloatingBookingCTA';
