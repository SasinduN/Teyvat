// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/** AA contrast on every page type in Ocean, light and dark, at 375 and 1280 px (./contrast-suite.ts). */
import { contrastSuite } from './contrast-suite';

contrastSuite('ocean');
