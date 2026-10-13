import { pool } from '../server/src/db';
try {
 const columns=await pool.query("select table_name,column_name,data_type from information_schema.columns where table_schema='public' and table_name like 'booking%' order by table_name,ordinal_position");
 const constraints=await pool.query("select conrelid::regclass::text as table_name,conname,pg_get_constraintdef(oid) as definition from pg_constraint where connamespace='public'::regnamespace and conrelid::regclass::text like 'booking%'");
 const ledger=await pool.query('select filename from public.schema_migrations order by filename');
 const vehicles=await pool.query('select id,name,passenger_capacity,luggage_capacity,accepting_requests from public.booking_vehicles');
 console.log(JSON.stringify({columns:columns.rows,constraints:constraints.rows,migrations:ledger.rows,vehicles:vehicles.rows}));
} finally { await pool.end(); }
