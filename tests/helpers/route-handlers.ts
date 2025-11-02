import type { FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/cookie';
import type { JsonValue } from '@bufbuild/protobuf';
import { create, fromJson, toJson } from '@bufbuild/protobuf';
import { verifyJWT, signJWT, type JWTPayload } from '../../src/lib/auth/jwt';
import {
  getPlayerIdForUser,
  getBeji,
  getWorld as getWorldFromRedis,
  getBejiForPlayer as getBejiForPlayerRedis,
  getPlayer,
  getStaticBejiForWorld,
  savePlayer,
  saveBeji,
  saveStaticBeji,
  saveWorld,
} from '../../src/lib/redis/gameState';
import type { Beji as BejiType, Player as PlayerType, StaticBeji as StaticBejiType, World as WorldType } from '../../components/atoms';
import {
  CreateWorldRequestSchema,
  CreateWorldResponseSchema,
  GetWorldRequestSchema,
  GetWorldResponseSchema,
} from '../../src/proto/world/v1/world_pb';
import {
  GetPublicConfigRequestSchema,
  GetPublicConfigResponseSchema,
} from '../../src/proto/config/v1/config_pb';
import {
  GetUserBejisRequestSchema,
  GetUserBejisResponseSchema,
  BejiWithWorldSchema,
} from '../../src/proto/player/v1/player_pb';
import { codepointsToEmoji } from '../../components/emoji';
import { convertAppToProto, convertBejiToProto, convertWorldToSummary } from './proto-helpers';

// Helper to get env vars at runtime only
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

// Helper to authenticate requests
async function authenticateRequest(request: { headers: { cookie?: string } }): Promise<JWTPayload | null> {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies.auth_token;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyJWT(token);
    return payload;
  } catch (error) {
    return null;
  }
}

// Route handlers
export async function handleGetToken(request: FastifyRequest, reply: FastifyReply) {
  const payload = await authenticateRequest(request);

  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  return { userId: payload.userId, email: payload.email };
}

export async function handleGoogleOAuth(request: FastifyRequest, reply: FastifyReply) {
  const { code, error } = request.query as { code?: string; error?: string };
  const hostname = 'localhost';
  const port = 3000;

  const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

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
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return reply.redirect('/en');
  } catch (error) {
    return reply.redirect(`/?error=callback_error`);
  }
}

export async function handleConfigRpc(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as { method: string; params: unknown };
    const { method, params } = body;

    if (method === 'GetPublicConfig') {
      const req = fromJson(GetPublicConfigRequestSchema, params as JsonValue);

      const googleClientId = getEnvVar('GOOGLE_CLIENT_ID');
      if (!googleClientId) {
        return reply.status(500).send({ error: 'Google Client ID not configured' });
      }

      const response = create(GetPublicConfigResponseSchema, { googleClientId });
      return toJson(GetPublicConfigResponseSchema, response);
    }

    return reply.status(400).send({ error: `Unknown method: ${method}` });
  } catch (error) {
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

export async function handleWorldRpc(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as { method: string; params: unknown };
    const { method, params } = body;

    if (method === 'CreateWorld') {
      const req = fromJson(CreateWorldRequestSchema, params as JsonValue);

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
      const response = create(CreateWorldResponseSchema, { world: worldData });

      return toJson(CreateWorldResponseSchema, response);
    } else if (method === 'GetWorld') {
      const req = fromJson(GetWorldRequestSchema, params as JsonValue);

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
      const response = create(GetWorldResponseSchema, { world: worldData });

      return toJson(GetWorldResponseSchema, response);
    } else {
      return reply.status(400).send({ error: `Unknown method: ${method}` });
    }
  } catch (error) {
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

export async function handlePlayerRpc(request: FastifyRequest, reply: FastifyReply) {
  const payload = await authenticateRequest(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const userId = payload.userId;

  const body = request.body as { method: string; params: unknown };
  const { method, params } = body;

  if (method === 'GetUserBejis') {
    const req = fromJson(GetUserBejisRequestSchema, params as JsonValue);

    if (req.userId !== userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const playerId = await getPlayerIdForUser(req.userId);

    if (!playerId) {
      const response = create(GetUserBejisResponseSchema, { bejis: [] });
      return toJson(GetUserBejisResponseSchema, response);
    }

    const bejis = await getBejiForPlayerRedis(playerId);

    const bejisWithWorlds = await Promise.all(
      bejis.map(async (beji) => {
        const world = beji.worldId ? await getWorldFromRedis(beji.worldId) : null;
        return create(BejiWithWorldSchema, {
          beji: convertBejiToProto(beji),
          world: convertWorldToSummary(world) || undefined,
        });
      })
    );

    const response = create(GetUserBejisResponseSchema, {
      bejis: bejisWithWorlds,
    });

    return toJson(GetUserBejisResponseSchema, response);
  } else {
    return reply.status(400).send({ error: `Unknown method: ${method}` });
  }
}

export async function handleGetUserBejis(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = request.params as { userId: string };

  const payload = await authenticateRequest(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

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
}

