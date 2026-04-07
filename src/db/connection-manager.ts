import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
// import Redis from 'ioredis'; // 1. Comment out the import
import { introspectSchema } from './schema-introspector.js';
import { DBConnectionConfig } from '../types/index.js';

class ConnectionManager {
  private pools = new Map<string, { pool: any; type: string; client?: MongoClient }>();
  private schemas = new Map<string, any>(); // 2. Add an in-memory map to store schemas instead of Redis
  // private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379'); // 3. Comment out Redis initialization

  async addConnection(config: DBConnectionConfig): Promise<string> {
    const dbId = `db_${Date.now()}`;

    let pool: any;
    let client: MongoClient | undefined;

    if (config.type === 'postgres') {
      pool = new Pool({
        host: config.host,
        port: config.port || 5432,
        database: config.database,
        user: config.user,
        password: config.password,
        max: 20,
      });
    } else if (config.type === 'mysql') {
      pool = await mysql.createPool({
        host: config.host,
        port: config.port || 3306,
        database: config.database,
        user: config.user,
        password: config.password,
        connectionLimit: 20,
      });
    } else if (config.type === 'mongodb') {
      const url = config.url || `mongodb://${config.host || 'localhost'}:${config.port || 27017}`;
      const dbName = config.dbName || config.database;
      if (!dbName) throw new Error('MongoDB database name is required via dbName or database');

      client = new MongoClient(url);
      await client.connect();
      pool = client.db(dbName);
    } else {
      throw new Error('Unsupported database type');
    }

    this.pools.set(dbId, { pool, type: config.type, client });

    const schema = await introspectSchema(pool, config.type);
    // 4. Store schema in memory instead of calling this.redis.set
    this.schemas.set(`schema:${dbId}`, schema); 

    console.log(`✅ Database connected: ${dbId} (${config.type})`);
    return dbId;
  }

  getPool(dbId: string) {
    const conn = this.pools.get(dbId);
    if (!conn) throw new Error(`Database ${dbId} not found`);
    return conn.pool;
  }

  getType(dbId: string): string {
    return this.pools.get(dbId)?.type || '';
  }
}

export const dbManager = new ConnectionManager();