import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { dbManager } from '../db/connection-manager.js';

const llm = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });

// Update this block in src/agent/db-agent.ts
const executeQueryTool = tool(
  async ({ dbId, query, collection }: { dbId: string; query: any; collection?: string }) => {
    const pool = dbManager.getPool(dbId);
    const dbType = dbManager.getType(dbId);

    if (dbType === 'mongodb') {
      if (!collection) throw new Error("Collection name required for MongoDB");
      // Basic MongoDB find logic
      const results = await pool.collection(collection).find(JSON.parse(query)).toArray();
      return JSON.stringify(results);
    }
    
    // Existing SQL logic...
    if (dbType === 'postgres' || dbType === 'mysql') {
       return await pool.query(query);
    }
  },
  {
    name: 'execute_safe_query',
    description: 'Execute queries on SQL or MongoDB',
    schema: z.object({ dbId: z.string(), query: z.string(), collection: z.string().optional() }),
  }
);

const connectDBTool = tool(
  async ({ type, host, port, user, password, database, url, dbName, name }: { type: string; host?: string; port?: number; user?: string; password?: string; database?: string; url?: string; dbName?: string; name?: string }) => {
    const dbId = await dbManager.addConnection({
      type: type as any,
      host,
      port,
      user,
      password,
      database,
      url,
      dbName,
      name: name || dbName || database || 'default_db',
    });
    return `Successfully connected! Your database ID is: ${dbId}`;
  },
  {
    name: 'connect_database',
    description: 'Connect to a database',
    schema: z.object({
      type: z.string(),
      host: z.string().optional(),
      port: z.number().optional(),
      user: z.string().optional(),
      password: z.string().optional(),
      database: z.string().optional(),
      url: z.string().optional(),
      dbName: z.string().optional(),
      name: z.string().optional(),
    }),
  }
);

export const dbAgent = createReactAgent({
  llm,
  tools: [executeQueryTool, connectDBTool],
});