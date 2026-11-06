/**
 * A fake WhatsApp number, for local and test data only, so the button shows while
 * developing, in the tests and in screenshots. It belongs to nobody: tests only check the
 * link's format, and nothing opens it.
 *
 * Never in a migration, or under `src/`, `shared/` or `server/src/`: migrations run on
 * production, where the number is whatever the admin set (`dev-whatsapp.test`).
 */
export const DEV_WHATSAPP_NUMBER = '94771236478';
