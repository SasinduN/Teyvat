/**
 * A tour's price (0030): NULL, or 0, is "Price on request". Never a blank, never "$0".
 * Every place that shows a tour's price reads these.
 */
export const PRICE_ON_REQUEST = 'Price on request';

/** A price worth showing: a positive number of US dollars. */
export const hasTourPrice = (price: number | null | undefined): price is number =>
  typeof price === 'number' && Number.isFinite(price) && price > 0;
