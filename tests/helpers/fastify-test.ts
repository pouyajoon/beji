import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

/**
 * Creates a minimal Fastify instance for testing
 * This can be extended with routes as needed for specific tests
 */
export async function createTestFastify(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false, // Disable logging in tests
  });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  return fastify;
}

