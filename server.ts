// Load environment variables from .env.local (before other imports)

import { Interceptor } from '@connectrpc/connect';
import { fastifyConnectPlugin } from '@connectrpc/connect-fastify';
import fastifyCookiePlugin from '@fastify/cookie';
import fastifyCorsPlugin from '@fastify/cors';
import fastifyMiddiePlugin from '@fastify/middie';
import fastifyStaticPlugin from '@fastify/static';
import fastifyWebsocketPlugin from '@fastify/websocket';
import { config } from 'dotenv';
import Fastify from 'fastify';
import type { IncomingMessage, ServerResponse } from 'http';
import path, { resolve } from 'path';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';

import { verifyJWT, signJWT, type JWTPayload } from './src/lib/auth/jwt';
import {
  getPlayerIdForUser,
  updateBejiPosition,
  getBeji,
  getWorld as getWorldFromRedis,
  getBejiForPlayer as getBejiForPlayerRedis,
} from './src/lib/redis/gameState';
import {
  registerPublicRoutes,
  registerAuthenticatedRoutes,
} from './src/lib/rpc/routes';
import { AUTH_CONTEXT_KEY } from './src/lib/rpc/services/playerService';
// Proto imports removed - now handled by service implementations

// __filename and __dirname already defined above for dotenv config

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local file
config({ path: resolve(__dirname, '.env.local') });

const dev = process.env.NODE_ENV !== 'production';
// Render requires binding to 0.0.0.0, default Fastify behavior is 0.0.0.0 if host not specified
const hostname = process.env.HOSTNAME || (dev ? 'localhost' : '0.0.0.0');
const port = parseInt(process.env.PORT || '3000', 10);

const fastify = Fastify({
  logger: {
    level: dev ? 'info' : 'warn',
    // In development, use pretty printing for better readability
    ...(dev && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname,reqId',
          singleLine: false,
        },
      },
    }),
  },
  // Only log errors in production, disable request logging for static assets
  disableRequestLogging: !dev, // Disable in production, enable in dev but filter below
});

// Helper to get env vars
function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

// Helper to parse cookies
function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

// Auth helper
async function authenticateRequest(request: { headers: { cookie?: string } }): Promise<JWTPayload | null> {
  try {
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies.auth_token;

    if (!token) {
      return null;
    }

    const payload = await verifyJWT(token);
    return payload;
  } catch {
    return null;
  }
}

// Conversion functions removed - now handled by service implementations

// Register CORS plugin
await fastify.register(fastifyCorsPlugin, {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);

    // Allow localhost and same origin in development
    if (dev || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return cb(null, true);
    }

    // In production, allow configured origins or same origin
    const allowedOrigins = getEnvVar('ALLOWED_ORIGINS')?.split(',') || [];
    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }

    // Default: allow same origin
    return cb(null, true);
  },
  credentials: true,
});

// Register WebSocket plugin
await fastify.register(fastifyWebsocketPlugin);

// Register middie plugin for Vite middleware integration
await fastify.register(fastifyMiddiePlugin);

// Register cookie plugin
await fastify.register(fastifyCookiePlugin);

// Authentication interceptor for Connect RPC
// Only applies to authenticated routes (PlayerService)
// Access cookies from request headers (cookies are sent in Cookie header)
const authInterceptor: Interceptor = (next) => async (req) => {
  // Only require auth for PlayerService
  const isPlayerService = req.service.typeName.includes('PlayerService');

  if (isPlayerService) {
    // Get cookie header from Connect request
    const cookieHeader = req.header.get('cookie');

    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      const token = cookies.auth_token;

      if (token) {
        try {
          const payload = await verifyJWT(token);
          // Store auth payload in context for use by services
          // The context is available on the request as contextValues
          req.contextValues.set(AUTH_CONTEXT_KEY, payload);
        } catch {
          // Auth failed, but don't throw here - let services decide
        }
      }
    }
  }

  return next(req);
};

// Register Connect RPC plugin
await fastify.register(fastifyConnectPlugin, {
  routes: (router) => {
    // Register all routes on the same router
    // Public routes (Config, World) - no auth required
    registerPublicRoutes(router);

    // Authenticated routes (Player) - auth handled by interceptor
    registerAuthenticatedRoutes(router);
  },
  // Apply auth interceptor to all routes, but it only processes PlayerService
  interceptors: [authInterceptor],
  // Connect RPC uses binary protocol buffers (application/connect+proto) by default
  // This ensures efficient binary serialization of proto messages
});

// Authentication routes
fastify.get('/api/authentication/get-token', async (request, reply) => {
  const payload = await authenticateRequest(request);

  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  return { userId: payload.userId, email: payload.email };
});

fastify.post('/authentication/logout', async (request, reply) => {
  reply.setCookie('auth_token', '', {
    httpOnly: true,
    secure: getEnvVar('NODE_ENV') === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return reply.send({ success: true });
});

// Google OAuth callback
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

fastify.get('/authentication/oauth/google', async (request, reply) => {
  try {
    const { code, error } = request.query as { code?: string; error?: string };

    fastify.log.info({ msg: '[OAuth] Callback received', code: code ? 'present' : 'missing', error });

    if (error) {
      fastify.log.warn({ msg: '[OAuth] Error in callback', error });
      reply.redirect(`/?error=oauth_failed`);
      return;
    }

    if (!code) {
      fastify.log.warn('[OAuth] No authorization code received');
      reply.redirect(`/?error=no_code`);
      return;
    }

    const clientId = getEnvVar('GOOGLE_CLIENT_ID');
    const clientSecret = getEnvVar('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      fastify.log.error('[OAuth] Missing Google OAuth credentials');
      reply.redirect(`/?error=config_error`);
      return;
    }

    const redirectUri = `${request.headers.origin || `http://${hostname}:${port}`}/authentication/oauth/google`;
    fastify.log.info({ msg: '[OAuth] Exchanging code for token', redirectUri });

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      fastify.log.error({ msg: '[OAuth] Token exchange failed', error: errorText });
      reply.redirect(`/?error=token_exchange_failed`);
      return;
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    if (!access_token) {
      fastify.log.error('[OAuth] No access token in response');
      reply.redirect(`/?error=no_access_token`);
      return;
    }

    fastify.log.info('[OAuth] Fetching user info');

    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      fastify.log.error({ msg: '[OAuth] User info fetch failed', error: errorText });
      reply.redirect(`/?error=userinfo_failed`);
      return;
    }

    const userInfo = await userInfoResponse.json();
    fastify.log.info({ msg: '[OAuth] User authenticated', userId: userInfo.id, email: userInfo.email, picture: userInfo.picture ? 'present' : 'missing' });

    const jwt = await signJWT({
      userId: userInfo.id,
      email: userInfo.email,
      picture: userInfo.picture, // Include user's profile picture from Google
    });

    reply.setCookie('auth_token', jwt, {
      httpOnly: true,
      secure: getEnvVar('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    fastify.log.info('[OAuth] Authentication successful, redirecting to root');
    reply.redirect('/');
    return;
  } catch (error) {
    fastify.log.error({ msg: '[OAuth] Callback error', error: error instanceof Error ? error.message : String(error) });
    reply.redirect(`/?error=callback_error`);
    return;
  }
});

// Legacy POST routes removed - now using Connect RPC via fastifyConnectPlugin
// RPC routes are handled by Connect at:
// - /api/config.v1.ConfigService/*
// - /api/world.v1.WorldService/*
// - /api/player.v1.PlayerService/*

fastify.get('/api/users/:userId/bejis', async (request, reply) => {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { userId } = request.params as { userId: string };

    if (payload.userId !== userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const playerId = await getPlayerIdForUser(userId);
    if (!playerId) {
      return { bejis: [] };
    }

    const bejis = await getBejiForPlayerRedis(playerId);
    const bejisWithWorlds = await Promise.all(
      bejis.map(async (beji) => {
        const world = beji.worldId ? await getWorldFromRedis(beji.worldId) : null;
        return {
          ...beji,
          world: world
            ? {
              id: world.id,
              mainBejiId: world.mainBejiId,
              createdAt: world.createdAt,
            }
            : null,
        };
      })
    );

    return { bejis: bejisWithWorlds };
  } catch (error) {
    console.error('Error getting user bejis:', error);
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// WebSocket for beji sync
fastify.get('/api/ws/beji-sync', { websocket: true }, (connection, req) => {
  let userId: string | null = null;
  let playerId: string | null = null;
  let bejiId: string | null = null;
  const connectionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  (async () => {
    // @ts-expect-error - Fastify websocket connection has socket property but types are incomplete
    const socket: WebSocket = connection.socket;

    try {
      const cookies = parseCookies(req.headers.cookie || '');
      const token = cookies.auth_token;

      if (!token) {
        socket.close(1008, 'Unauthorized: No token');
        return;
      }

      const payload = await verifyJWT(token);
      userId = payload.userId;
      playerId = await getPlayerIdForUser(userId);

      if (!playerId) {
        socket.close(1008, 'Unauthorized: Player not found');
        return;
      }

      fastify.log.info(`WebSocket connected: ${connectionId} (user: ${userId}, player: ${playerId})`);

      socket.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'connect' && message.bejiId) {
            const beji = await getBeji(message.bejiId);
            if (!beji || beji.playerId !== playerId) {
              const playerBejis = await getBejiForPlayerRedis(playerId!);
              const isOwnedByPlayer = playerBejis.some((b) => b.id === message.bejiId);

              if (!isOwnedByPlayer) {
                socket.send(
                  JSON.stringify({
                    error: 'Forbidden',
                    message: `Beji ${message.bejiId} does not belong to player`,
                  })
                );
                return;
              }
            }

            bejiId = message.bejiId;
            fastify.log.info(`Beji ${bejiId} connected via WebSocket ${connectionId}`);

            socket.send(
              JSON.stringify({
                type: 'connected',
                bejiId: bejiId,
              })
            );
          } else if (message.type === 'update' && message.bejiId && message.position) {
            if (message.bejiId !== bejiId) {
              const beji = await getBeji(message.bejiId);
              if (!beji || beji.playerId !== playerId) {
                socket.send(JSON.stringify({ error: 'Forbidden' }));
                return;
              }
              bejiId = message.bejiId;
            }

            const position = message.position as { x: number; y: number };
            const target = message.target as { x: number; y: number } | undefined;
            const walk = message.walk as boolean | undefined;

            await updateBejiPosition(message.bejiId, position, target, walk);

            const updatedBeji = await getBeji(message.bejiId);
            if (updatedBeji) {
              socket.send(
                JSON.stringify({
                  type: 'update',
                  bejiId: updatedBeji.id,
                  position: updatedBeji.position,
                  target: updatedBeji.target,
                  walk: updatedBeji.walk,
                })
              );
            }
          } else if (message.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          socket.send(
            JSON.stringify({
              error: 'Internal server error',
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        }
      });

      const pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      socket.on('close', () => {
        clearInterval(pingInterval);
        fastify.log.info(`WebSocket disconnected: ${connectionId}`);
      });

      socket.on('error', (error: Error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        clearInterval(pingInterval);
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      socket.close(1008, 'Authentication failed');
    }
  })();
});

// Serve Vite dev server in development or static files in production
// IMPORTANT: Fastify routes are registered BEFORE Vite middleware
// Fastify will handle /api/* and /authentication/* routes first
// Vite only handles unmatched routes for the SPA
if (dev) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  // Wrap Vite middleware to skip API and authentication routes
  // Fastify routes are checked FIRST, so if a route matches, Fastify handles it
  // This middleware only runs for unmatched routes, but we still need to exclude auth/API
  // from being passed to Vite (in case Fastify returns 404, we don't want Vite to serve SPA)
  const originalMiddleware = vite.middlewares;
  const wrappedMiddleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ): void => {
    const url = req.url?.split('?')[0]; // Remove query string for route matching
    // Don't pass API/auth routes to Vite - Fastify handles these (or returns 404)
    if (url?.startsWith('/api/') || url?.startsWith('/authentication/')) {
      // If Fastify already handled it, response is sent - do nothing
      // If Fastify didn't handle it (404), don't pass to Vite either
      // Fastify will have sent its response already, so just call next() to finish the request
      return next();
    }
    // Pass other routes to Vite for SPA handling
    return originalMiddleware(req, res, next);
  };

  await fastify.use(wrappedMiddleware);
} else {
  await fastify.register(fastifyStaticPlugin, {
    root: path.join(__dirname, 'dist'),
    prefix: '/',
  });
}

// SPA fallback - serve index.html for all non-API routes
if (!dev) {
  fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/authentication/')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
}

// Start server
try {
  await fastify.listen({ port, host: hostname });
  fastify.log.info(`> Fastify server ready on http://${hostname}:${port}`);
  fastify.log.info(`> WebSocket server ready on ws://${hostname}:${port}/api/ws/beji-sync`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
