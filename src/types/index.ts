export type DBType = 'postgres' | 'mysql' | 'mongodb';

export interface DBConnectionConfig {
  type: DBType;
  name: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  url?: string;
  dbName?: string;
}

export interface UserPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}