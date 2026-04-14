import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import 'dotenv/config';
import { dbManager } from '../db/connection-manager.js';
import { dbAgent } from '../agent/db-agent.js'; // Ensure .js extension is here

const server = new Server(
  { name: "MCP-DB-Agent", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "connect_database",
      description: "Connect to PostgreSQL, MySQL, or MongoDB",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["postgres", "mysql", "mongodb"] },
          host: { type: "string" },
          port: { type: "number" },
          user: { type: "string" },
          password: { type: "string" },
          database: { type: "string" }, // for SQL
          url: { type: "string" },      // for MongoDB
          dbName: { type: "string" },   // for MongoDB
          name: { type: "string" }
        },
        required: ["type", "name"]
      }
    },
    {
      name: "query_db",
      description: "Query the database using natural language",
      inputSchema: {
        type: "object",
        properties: {
          dbId: { type: "string" },
          prompt: { type: "string" }
        },
        required: ["dbId", "prompt"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "connect_database") {
    const { type, host, port, user, password, database, url, dbName, name } = request.params.arguments as any;
    let dbId;
    if (type === 'mongodb') {
      dbId = await dbManager.addConnection({ type: 'mongodb', url, dbName, name });
    } else if (type === 'mysql' || type === 'postgres') {
      dbId = await dbManager.addConnection({
        type: type as any,
        host,
        port,
        user,
        password,
        database,
        name: name || database || dbName || 'default_db',
      });
    } else {
      throw new Error(`Database type ${type} not supported yet`);
    }
    return {
      content: [{ type: "text", text: `Connected! ID: ${dbId}` }]
    };
  }

  if (request.params.name === "query_db") {
    const { dbId, prompt } = request.params.arguments as { dbId: string, prompt: string };

    // Check if dbAgent is defined before calling invoke
    if (!dbAgent) {
      throw new Error("Internal Error: dbAgent is undefined. Check your imports.");
    }

    const enhancedPrompt = `Database ID: ${dbId}. User question: ${prompt}`;
    const result = await dbAgent.invoke(
      { messages: [{ role: 'user', content: enhancedPrompt }] }
    );

    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
  throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);