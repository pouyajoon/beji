import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import {
  handleGetToken,
  handleGoogleOAuth,
  handleConfigRpc,
  handleWorldRpc,
  handlePlayerRpc,
  handleGetUserBejis,
} from './route-handlers';

/**
 * Creates a Fastify instance with RPC routes registered for testing
 */
export async function createTestFastifyWithRoutes(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
  });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Authentication routes
  fastify.get('/api/authentication/get-token', handleGetToken);
  fastify.get('/authentication/oauth/google', handleGoogleOAuth);

  // RPC Routes
  fastify.post('/api/rpc/config/v1', handleConfigRpc);
  fastify.post('/api/rpc/world/v1', handleWorldRpc);
  fastify.post('/api/rpc/player/v1', handlePlayerRpc);

  // User routes
  fastify.get('/api/users/:userId/bejis', handleGetUserBejis);

  return fastify;
}

