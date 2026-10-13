import { pool } from '../server/src/db';
import { env, isProduction } from '../server/src/env';
const host=new URL(env.DATABASE_URL).hostname;
if(isProduction || !['localhost','127.0.0.1','[::1]','::1'].includes(host))throw new Error('Local development database only.');
try {
 const result=await pool.query("update public.booking_vehicles set passenger_capacity=5,luggage_capacity=3,accepting_requests=true where id in ('car','suv') returning id,passenger_capacity,luggage_capacity,accepting_requests");
 console.log(JSON.stringify(result.rows));
}finally{await pool.end()}
