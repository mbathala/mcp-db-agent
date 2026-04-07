import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';
import { UserPayload } from '../types/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserPayload;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
    request.user = decoded;
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
};