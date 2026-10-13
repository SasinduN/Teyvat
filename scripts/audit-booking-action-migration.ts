import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pool } from '../server/src/db';
const client=await pool.connect();
try {
 const before=(await client.query('select ip::text,action,attempts,window_started from public.booking_attempts order by ip,action')).rows;
 await client.query(await readFile('db/migrations/0016_booking_attempt_actions.sql','utf8'));
 const after=(await client.query('select ip::text,action,attempts,window_started from public.booking_attempts order by ip,action')).rows;assert.deepEqual(after,before);
 const key=(await client.query("select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.booking_attempts'::regclass and contype='p'")).rows[0];assert.equal(key.definition,'PRIMARY KEY (ip, action)');
 await client.query('begin');
 for(const action of ['session','create','change'])await client.query("insert into public.booking_attempts(ip,action) values ('192.0.2.99',$1) on conflict(ip,action) do update set attempts=booking_attempts.attempts+1",[action]);
 await client.query('rollback');console.log('PASS: migration rerun preserves counters; composite key supports all actions; test writes rolled back.');
}finally{client.release();await pool.end()}
