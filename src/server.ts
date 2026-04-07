import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
// import rateLimit from '@fastify/rate-limit';
import { authenticate } from './auth/auth.middleware.js';
import { dbManager } from './db/connection-manager.js';
import { dbAgent } from './agent/db-agent.js';

const fastify = Fastify({ logger: true });

fastify.register(cors);
// fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' });

fastify.post('/connect', { preHandler: authenticate }, async (req: any, reply) => {
  try {
    const dbId = await dbManager.addConnection(req.body);
    return { success: true, dbId };
  } catch (err: any) {
    reply.code(400);
    return { error: err.message };
  }
});

fastify.post('/query', { preHandler: authenticate }, async (req: any, reply) => {
  try {
    const { dbId, prompt } = req.body;
    
    // Include dbId in the prompt so the agent knows which database to query
    const enhancedPrompt = `
You have access to a database with ID: ${dbId}

User wants to know: ${prompt}

To answer this, you need to use the execute_safe_query tool with the database ID "${dbId}" and an appropriate SQL query.
For counting users, use a query like: SELECT COUNT(*) FROM users;
`;
    
    const result = await dbAgent.invoke(
      { messages: [{ role: 'user', content: enhancedPrompt }] }
    );
    
    return result;
  } catch (err: any) {
    reply.code(500);
    return { error: err.message };
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 8080, host: '0.0.0.0' });
    console.log('MCP DB Agent is running on http://localhost:8080');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();