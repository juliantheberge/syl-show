import { Pool } from 'pg';
import { dbConfig } from "../config/combiner";

const pool = new Pool(dbConfig);

let db = {
  query: (text:string, params:any[]) => pool.query(text, params)
}

export { db };
