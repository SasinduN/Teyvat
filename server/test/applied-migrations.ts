/**
 * Every migration that is in `main`, by its content's SHA-256 (line endings
 * normalised to \n). A migration is applied to production by the deploy that
 * follows its merge, and `scripts/migrate.ts` records only its *file name* in
 * `schema_migrations`: an edit to an applied file is never run there, so it
 * silently makes production differ from every fresh database. So applied
 * migrations are never edited; a change is a new migration (CLAUDE.md).
 *
 * `migrations-frozen.test.ts` fails if a listed file's content changes, if one
 * is deleted, or if a migration file isn't listed. Add a new migration's hash
 * in the PR that adds it (the test prints it); from its merge on, it's frozen.
 *
 * It lives here, not in db/migrations/: `migrate` refuses to run with any file
 * there that isn't a migration.
 */
import { createHash } from 'node:crypto';

export const APPLIED_MIGRATIONS: Readonly<Record<string, string>> = {
  '0001_init.sql': '5cd32a576b238d973ce1b2010c240a471b33d4623f06df311ce3edd7c0c2a7d9',
  '0002_seed.sql': '5a8b6b5d9a7cd637d46590a8efe4278c8bf7980dc48d04da67d4e174b481f97d',
  '0003_login_attempts.sql': '792247e2205d507d87af31fb994bf7ac587369ec9c377ee14664ee404d99ae5e',
  '0004_site_settings_links.sql': '322175840e8496833d89793d7c92ab4f301b61ddb0f6355a9b5106879a4a8e94',
  '0005_media.sql': '83ae813bdfe63a712d59dda67842f16855df1d2a72072cb594437899aa6959cf',
  '0006_inquiries.sql': '2e688ca6028fda85c85882629241936a53d3f40d7db58c5454dfe48f9a12fe51',
  '0007_tour_stops.sql': '98e81e744ef7551f101de7ad680eeac9c7c77df5173b4e0b43eb00b39cac84a1',
  '0008_site_settings_whatsapp.sql': 'a25688e2c1397cecdfe4cab048ab219d9a9322a031ce0a08edff4e4d28e0c9f0',
  '0009_newsletter.sql': '4cfd6c4114d52841756fb6fc5f3dc9daf650eae1df9fd8acd1c572af612425e0',
  '0010_location_photography.sql': '3e512e5f932ef97c55a6d10f9f6ff46063349c5ad22ce08dbda3cdb52f4f0dde',
  '0011_image_credits.sql': '9bc5c97db34830cc0d71dca2cc488dbcf40ef6e6313280ca3ff923c14668ab15',
  '0012_newsletter_unsubscribe.sql': '5b6be22aa6a5aca51e28c7e6d86cd28ce2ca7f3a9e2d72039732e41a0ab21d59',
  '0013_wikimedia_fallback.sql': 'e47630be9e7e116b155a790229248c9918a36f469932fbe4d74e511eec4765db',
  '0014_bookings.sql': '8badfac744c8a95c5e8d4701fe07a39d2a710f05db8cebcc116ca3ec525dfb61',
  '0015_manual_rides.sql': 'c1efb451d7450f7a4ff847ed15c2aad3d75f0dc1fe69ac4af8ada72f733c8005',
  '0016_booking_attempt_actions.sql': '1ebde62cec1e4e7a4ae01beeceec79cc5692b5e4c5aa1c5eb5328a852a125115',
  '0017_suv_category.sql': '69f8d58c8e7555a2dac831ca96c82b3a6c1b39069de56aba93080c33ee18af92',
  '0018_ride_vehicle_capacities.sql': '4cef356e40467bb773b2152c5787e8d20bd0fcd97792e14953693d2f72a61960',
  '0019_site_settings_text_size.sql': 'c23fc8e6eccd3026a00840ef3ac44fff795b8c26db057840873ce1e9611d43ee',
  '0020_media_photo_sets.sql': 'd04fdaa49479a839ad6eebf0ae306f41c3ba06ce30f4d8eb4ab88976a10b2bb4',
  '0021_site_stats_plain_copy.sql': '2b546bce531f58abbec25b670e2c947b36b1245674fb9daa2e61887d6c1ff167',
  '0022_when_to_go.sql': '271d81c85da617156eed8c464d29d0a8ddbd9dae672f5cda223e64916eaa76ce',
  '0023_attractions.sql': '5e2d7dca5c148bf8f9ae3f07588428e8bb833c1259d390803cc69a3f6114f10c',
  '0024_site_settings_brand.sql': '41fce8b396c878a4a292115c3991e5c47017c4da6247d59e36188bab49826a12',
  '0025_rebrand_seed_text.sql': '0af53134def62b8bbeb0d449d2c0aa5d1bc284567eb9d23576bdc6b050980693',
  '0026_seed_contact_placeholders.sql': '0e1db0b6659c07f48dee5e9d8486481f4899224312162b68f97b92a4bf20cff7',
};

/** A migration's hash, as listed above: SHA-256 of its text with \r\n as \n. */
export function migrationHash(text: string): string {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
}
