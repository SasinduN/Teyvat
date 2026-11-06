/**
 * Local data that isn't in the migrations: `npm run seed:dev`. Today that is the fake
 * WhatsApp number (`scripts/fixtures/dev-whatsapp.ts`), so the button shows on the local
 * site. A number already saved in the local admin stays.
 *
 * Only ever the local database: `scriptDatabaseUrl` refuses any other host, this script has
 * no `--prod`, and it stops under NODE_ENV=production.
 */
import '../shared/load-env';

import { Client } from 'pg';

import { describeDatabase, scriptDatabaseUrl } from '../shared/database-target';
import { DEV_WHATSAPP_NUMBER } from './fixtures/dev-whatsapp';

if (process.env.NODE_ENV === 'production') {
  console.error('seed:dev is for local databases only.');
  process.exit(1);
}

const url = await scriptDatabaseUrl({ prod: false, script: 'seed:dev' });
const client = new Client({ connectionString: url });
await client.connect();
try {
  const { rowCount } = await client.query(
    'update public.site_settings set whatsapp_number = $1 where id and whatsapp_number is null',
    [DEV_WHATSAPP_NUMBER]
  );
  console.log(
    rowCount
      ? `${describeDatabase(url)}: set the fake WhatsApp number ${DEV_WHATSAPP_NUMBER}.`
      : `${describeDatabase(url)}: a WhatsApp number is already saved; left as it is.`
  );
} finally {
  await client.end();
}
