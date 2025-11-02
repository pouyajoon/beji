import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyMiddie from '@fastify/middie';
import { WebSocket } from 'ws';
import type { JsonValue } from '@bufbuild/protobuf';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyJWT, signJWT, type JWTPayload } from './src/lib/auth/jwt';
import {
  getPlayerIdForUser,
  updateBejiPosition,
  getBeji,
  getBejiForPlayer,
  getWorld as getWorldFromRedis,
  getBejiForPlayer as getBejiForPlayerRedis,
  getPlayer,
  getStaticBejiForWorld,
  savePlayer,
  saveBeji,
  saveStaticBeji,
  saveWorld,
} from './src/lib/redis/gameState';
import type { Beji as BejiType, Player as PlayerType, StaticBeji as StaticBejiType, World as WorldType } from './components/atoms';
import {
  CreateWorldRequest,
  CreateWorldResponse,
  GetWorldRequest,
  GetWorldResponse,
  WorldData,
  World,
} from './src/proto/world/v1/world_pb';
import { Player } from './src/proto/player/v1/player_pb';
import { Beji } from './src/proto/beji/v1/beji_pb';
import { StaticBeji } from './src/proto/staticbeji/v1/staticbeji_pb';
import { Position } from './src/proto/common/v1/common_pb';
import { protoInt64 } from '@bufbuild/protobuf';
import { codepointsToEmoji } from './components/emoji';
import {
  GetPublicConfigRequest,
  GetPublicConfigResponse,
} from './src/proto/config/v1/config_pb';
import {
  GetUserBejisRequest,
  GetUserBejisResponse,
  WorldSummary,
  BejiWithWorld,
} from './src/proto/player/v1/player_pb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const fastify = Fastify({
  logger: true,
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
  } catch (error) {
    return null;
  }
}

// Convert proto types to app types
function convertProtoToApp(data: WorldData): {
  world: WorldType;
  player: PlayerType;
  beji: BejiType;
  staticBeji: StaticBejiType[];
} {
  if (!data.world || !data.player || !data.beji) {
    throw new Error('Missing required world data');
  }

  return {
    world: {
      id: data.world.id,
      mainBejiId: data.world.mainBejiId,
      staticBejiIds: data.world.staticBejiIds,
      createdAt: Number(data.world.createdAt.toString()),
    },
    player: {
      id: data.player.id,
      emoji: data.player.emoji,
      emojiCodepoints: data.player.emojiCodepoints,
      bejiIds: data.player.bejiIds,
      createdAt: Number(data.player.createdAt.toString()),
    },
    beji: {
      id: data.beji.id,
      playerId: data.beji.playerId,
      worldId: data.beji.worldId,
      emoji: data.beji.emoji,
      name: data.beji.name,
      position: data.beji.position ? { x: data.beji.position.x, y: data.beji.position.y } : { x: 0, y: 0 },
      target: data.beji.target ? { x: data.beji.target.x, y: data.beji.target.y } : { x: 0, y: 0 },
      walk: data.beji.walk,
      createdAt: Number(data.beji.createdAt.toString()),
    },
    staticBeji: data.staticBeji.map((sb) => ({
      id: sb.id,
      worldId: sb.worldId,
      emojiCodepoint: sb.emojiCodepoint,
      emoji: sb.emoji,
      position: sb.position ? { x: sb.position.x, y: sb.position.y } : { x: 0, y: 0 },
      harvested: sb.harvested,
    })),
  };
}

// Convert app types to proto types
function convertAppToProto(
  world: WorldType,
  player: PlayerType,
  beji: BejiType,
  staticBeji: StaticBejiType[]
): WorldData {
  return new WorldData({
    world: new World({
      id: world.id,
      mainBejiId: world.mainBejiId,
      staticBejiIds: world.staticBejiIds,
      createdAt: protoInt64.parse(world.createdAt.toString()),
    }),
    player: new Player({
      id: player.id,
      emoji: player.emoji,
      emojiCodepoints: player.emojiCodepoints,
      bejiIds: player.bejiIds,
      createdAt: protoInt64.parse(player.createdAt.toString()),
    }),
    beji: new Beji({
      id: beji.id,
      playerId: beji.playerId,
      worldId: beji.worldId,
      emoji: beji.emoji,
      name: beji.name,
      position: new Position({ x: beji.position.x, y: beji.position.y }),
      target: beji.target ? new Position({ x: beji.target.x, y: beji.target.y }) : undefined,
      walk: beji.walk,
      createdAt: protoInt64.parse(beji.createdAt.toString()),
    }),
    staticBeji: staticBeji.map((sb) =>
      new StaticBeji({
        id: sb.id,
        worldId: sb.worldId,
        emojiCodepoint: sb.emojiCodepoint,
        emoji: sb.emoji,
        position: new Position({ x: sb.position.x, y: sb.position.y }),
        harvested: sb.harvested,
      })
    ),
  });
}

function convertBejiToProto(beji: BejiType): Beji {
  return new Beji({
    id: beji.id,
    playerId: beji.playerId,
    worldId: beji.worldId,
    emoji: beji.emoji,
    name: beji.name,
    position: new Position({ x: beji.position.x, y: beji.position.y }),
    target: beji.target ? new Position({ x: beji.target.x, y: beji.target.y }) : undefined,
    walk: beji.walk,
    createdAt: protoInt64.parse(beji.createdAt.toString()),
  });
}

function convertWorldToSummary(world: WorldType | null): WorldSummary | null {
  if (!world) return null;
  return new WorldSummary({
    id: world.id,
    mainBejiId: world.mainBejiId,
    createdAt: protoInt64.parse(world.createdAt.toString()),
  });
}

// Register CORS plugin
await fastify.register(fastifyCors, {
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
await fastify.register(fastifyWebsocket);

// Register middie plugin for Vite middleware integration
await fastify.register(fastifyMiddie);

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
  const { code, error } = request.query as { code?: string; error?: string };

  if (error) {
    return reply.redirect(`/?error=oauth_failed`);
  }

  if (!code) {
    return reply.redirect(`/?error=no_code`);
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: getEnvVar('GOOGLE_CLIENT_ID')!,
        client_secret: getEnvVar('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: `${request.headers.origin || `http://${hostname}:${port}`}/authentication/oauth/google`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return reply.redirect(`/?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    if (!access_token) {
      return reply.redirect(`/?error=no_access_token`);
    }

    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return reply.redirect(`/?error=userinfo_failed`);
    }

    const userInfo = await userInfoResponse.json();
    const jwt = await signJWT({
      userId: userInfo.id,
      email: userInfo.email,
    });

    reply.setCookie('auth_token', jwt, {
      httpOnly: true,
      secure: getEnvVar('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return reply.redirect('/en');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return reply.redirect(`/?error=callback_error`);
  }
});

// RPC Routes
fastify.post('/api/rpc/config/v1', async (request, reply) => {
  try {
    const body = request.body as { method: string; params: unknown };
    const { method, params } = body;

    if (method === 'GetPublicConfig') {
      const req = GetPublicConfigRequest.fromJson(params as JsonValue);

      const googleClientId = getEnvVar('GOOGLE_CLIENT_ID');
      if (!googleClientId) {
        return reply.status(500).send({ error: 'Google Client ID not configured' });
      }

      const response = new GetPublicConfigResponse({ googleClientId });
      return response.toJson();
    }

    return reply.status(400).send({ error: `Unknown method: ${method}` });
  } catch (error) {
    console.error('Error in config RPC handler:', error);
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

fastify.post('/api/rpc/world/v1', async (request, reply) => {
  try {
    const body = request.body as { method: string; params: unknown };
    const { method, params } = body;

    if (method === 'CreateWorld') {
      const req = CreateWorldRequest.fromJson(params as JsonValue);

      if (!req.bejiName || !req.emojiCodepoints || req.emojiCodepoints.length === 0) {
        return reply.status(400).send({ error: 'bejiName and emojiCodepoints are required' });
      }

      const emojiChar = codepointsToEmoji(req.emojiCodepoints);
      const timestamp = Date.now();
      const playerId = `player-${timestamp}`;
      const worldId = `world-${timestamp}`;
      const bejiId = `beji-${timestamp}`;

      const startX = 0;
      const startY = 0;

      const newPlayer: PlayerType = {
        id: playerId,
        emoji: emojiChar,
        emojiCodepoints: req.emojiCodepoints,
        bejiIds: [bejiId],
        createdAt: timestamp,
      };

      const newBeji: BejiType = {
        id: bejiId,
        playerId: playerId,
        worldId: worldId,
        emoji: emojiChar,
        name: req.bejiName.trim(),
        position: { x: startX, y: startY },
        target: { x: startX, y: startY },
        walk: true,
        createdAt: timestamp,
      };

      const baseUnicode = req.emojiCodepoints[0] ?? 0x1f600;
      const staticBejis: StaticBejiType[] = [];
      const staticBejiIds: string[] = [];

      for (let offset = -5; offset <= 5; offset++) {
        const staticUnicode = baseUnicode + offset;
        const staticEmoji = codepointsToEmoji([staticUnicode]);

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 150;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        const staticBejiId = `static-beji-${timestamp}-${offset}-${Math.random().toString(36).substring(2, 9)}`;
        staticBejiIds.push(staticBejiId);

        staticBejis.push({
          id: staticBejiId,
          worldId: worldId,
          emojiCodepoint: staticUnicode,
          emoji: staticEmoji,
          position: { x, y },
          harvested: false,
        });
      }

      const newWorld: WorldType = {
        id: worldId,
        mainBejiId: bejiId,
        staticBejiIds: staticBejiIds,
        createdAt: timestamp,
      };

      await Promise.all([
        savePlayer(newPlayer),
        saveBeji(newBeji),
        saveWorld(newWorld),
        ...staticBejis.map((sb) => saveStaticBeji(sb)),
      ]);

      const worldData = convertAppToProto(newWorld, newPlayer, newBeji, staticBejis);
      const response = new CreateWorldResponse({ world: worldData });

      return response.toJson();
    } else if (method === 'GetWorld') {
      const req = GetWorldRequest.fromJson(params as JsonValue);

      if (!req.worldId) {
        return reply.status(400).send({ error: 'worldId is required' });
      }

      const world = await getWorldFromRedis(req.worldId);
      if (!world) {
        return reply.status(404).send({ error: 'World not found' });
      }

      const beji = await getBeji(world.mainBejiId);
      if (!beji) {
        return reply.status(404).send({ error: 'Main beji not found' });
      }

      const player = await getPlayer(beji.playerId);
      if (!player) {
        return reply.status(404).send({ error: 'Player not found' });
      }

      const staticBeji = await getStaticBejiForWorld(world.id);
      const worldData = convertAppToProto(world, player, beji, staticBeji);
      const response = new GetWorldResponse({ world: worldData });

      return response.toJson();
    }

    return reply.status(400).send({ error: `Unknown method: ${method}` });
  } catch (error) {
    console.error('Error in world RPC handler:', error);
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

fastify.post('/api/rpc/player/v1', async (request, reply) => {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = request.body as { method: string; params: unknown };
    const { method, params } = body;

    if (method === 'GetUserBejis') {
      const req = GetUserBejisRequest.fromJson(params as JsonValue);

      if (req.userId !== payload.userId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const playerId = await getPlayerIdForUser(req.userId);
      if (!playerId) {
        const response = new GetUserBejisResponse({ bejis: [] });
        return response.toJson();
      }

      const bejis = await getBejiForPlayerRedis(playerId);
      const bejisWithWorlds = await Promise.all(
        bejis.map(async (beji) => {
          const world = beji.worldId ? await getWorldFromRedis(beji.worldId) : null;
          return new BejiWithWorld({
            beji: convertBejiToProto(beji),
            world: convertWorldToSummary(world) || undefined,
          });
        })
      );

      const response = new GetUserBejisResponse({ bejis: bejisWithWorlds });
      return response.toJson();
    }

    return reply.status(400).send({ error: `Unknown method: ${method}` });
  } catch (error) {
    console.error('Error in player RPC handler:', error);
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

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

      console.log(`WebSocket connected: ${connectionId} (user: ${userId}, player: ${playerId})`);

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
            console.log(`Beji ${bejiId} connected via WebSocket ${connectionId}`);

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
        console.log(`WebSocket disconnected: ${connectionId}`);
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
if (dev) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  await fastify.use(vite.middlewares);
} else {
  await fastify.register(fastifyStatic, {
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
  console.log(`> Fastify server ready on http://${hostname}:${port}`);
  console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws/beji-sync`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
