# Environment Variables

This document lists all environment variables used in the Beji application.

## Required Variables

These variables must be set for the application to function properly.

### `REDISCLI_AUTH`
- **Required**: Yes
- **Description**: Full Redis connection URL
- **Format**: `redis://host:port` or `rediss://host:port` (with TLS)
- **Example**: 
  - `redis://red-xxxxx:6379` (Render internal Redis)
  - `redis://default:password@red-xxxxx:6379` (with authentication)
  - `rediss://redis.example.com:6380` (external Redis with TLS)
- **Used in**: `src/lib/redis/client.ts`
- **Note**: 
  - Must start with `redis://` or `rediss://`
  - Render.com automatically sets this when you link a Key Value instance to your service
  - Contains the complete connection string including protocol, host, port, and optionally credentials

### `GOOGLE_CLIENT_ID`
- **Required**: Yes
- **Description**: Google OAuth 2.0 Client ID for authentication
- **Format**: String (from Google Cloud Console)
- **Example**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Used in**: `server.ts`, `src/lib/rpc/services/configService.ts`
- **Note**: Required for OAuth authentication to work

### `GOOGLE_CLIENT_SECRET`
- **Required**: Yes
- **Description**: Google OAuth 2.0 Client Secret for authentication
- **Format**: String (from Google Cloud Console)
- **Example**: `GOCSPX-abcdefghijklmnopqrstuvwxyz`
- **Used in**: `server.ts`
- **Note**: Required for OAuth token exchange

### `JWT_SECRET`
- **Required**: Yes (but has fallback)
- **Description**: Secret key for signing and verifying JWT tokens
- **Format**: String (should be a strong random string)
- **Example**: `your-super-secret-jwt-key-change-in-production`
- **Default**: `"your-secret-key-change-in-production"` (⚠️ **NOT SECURE** - must change in production)
- **Used in**: `src/lib/auth/jwt.ts`
- **Note**: Should be a strong, random string in production

## Optional Variables

These variables have defaults or are only needed in specific scenarios.

### `NODE_ENV`
- **Required**: No
- **Description**: Environment mode (development or production)
- **Format**: `development` | `production`
- **Default**: `development` (if not set)
- **Used in**: `server.ts`
- **Effects**:
  - Development: Pretty logging, Vite dev server, localhost hostname
  - Production: Minimal logging, static file serving, secure cookies

### `PORT`
- **Required**: No
- **Description**: Port number for the server to listen on
- **Format**: Number (as string)
- **Default**: `3000`
- **Example**: `8080`
- **Used in**: `server.ts`
- **Note**: Render.com automatically sets this

### `HOSTNAME`
- **Required**: No
- **Description**: Hostname/IP address for the server to bind to
- **Format**: String (IP address or hostname)
- **Default**: `localhost` (development) or `0.0.0.0` (production)
- **Example**: `0.0.0.0`
- **Used in**: `server.ts`
- **Note**: Use `0.0.0.0` to accept connections from all interfaces

### `ALLOWED_ORIGINS`
- **Required**: No
- **Description**: Comma-separated list of allowed CORS origins
- **Format**: Comma-separated URLs
- **Example**: `https://example.com,https://www.example.com`
- **Used in**: `server.ts` (CORS configuration)
- **Note**: Only used in production. In development, all origins are allowed.


## Test-Only Variables

These variables are only used in diagnostic tests and are not required for normal operation.

### `REDIS_HOST`
- **Required**: No (test only)
- **Description**: Redis hostname for diagnostic tests
- **Used in**: `tests/redis-cloud-diagnostic.test.ts`
- **Default**: `redis-12901.c328.europe-west3-1.gce.redns.redis-cloud.com`

### `REDIS_PORT`
- **Required**: No (test only)
- **Description**: Redis port for diagnostic tests
- **Used in**: `tests/redis-cloud-diagnostic.test.ts`
- **Default**: `12901`

### `REDIS_USERNAME`
- **Required**: No (test only)
- **Description**: Redis username for diagnostic tests
- **Used in**: `tests/redis-cloud-diagnostic.test.ts`

### `REDIS_PASSWORD`
- **Required**: No (test only)
- **Description**: Redis password for diagnostic tests
- **Used in**: `tests/redis-cloud-diagnostic.test.ts`

## Example `.env.local` File

Create a `.env.local` file in the project root with the following structure:

# Required - Redis Configuration
REDISCLI_AUTH=redis://red-xxxxx:6379
# Or with authentication:
# REDISCLI_AUTH=redis://default:password@red-xxxxx:6379
# Or for external Redis with TLS:
# REDISCLI_AUTH=rediss://username:password@redis.example.com:6380

# Required - Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Required - JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Optional - Server Configuration
NODE_ENV=development
PORT=3000
HOSTNAME=localhost

# Optional - CORS (production only)
# ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Production Checklist

When deploying to production, ensure:

- ✅ `REDISCLI_AUTH` is set to your production Redis connection URL
- ✅ `GOOGLE_CLIENT_ID` is set to your production OAuth client ID
- ✅ `GOOGLE_CLIENT_SECRET` is set to your production OAuth client secret
- ✅ `JWT_SECRET` is set to a strong, random string (not the default!)
- ✅ `NODE_ENV` is set to `production`
- ✅ `ALLOWED_ORIGINS` is configured with your production domain(s)
- ✅ `PORT` is set (or let Render.com set it automatically)
- ✅ `HOSTNAME` is set to `0.0.0.0` (if needed)

## Security Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use strong secrets** - Generate random strings for `JWT_SECRET`
3. **Rotate secrets regularly** - Especially `JWT_SECRET` and `GOOGLE_CLIENT_SECRET`
4. **Use environment-specific values** - Different values for dev/staging/production
5. **Restrict CORS origins** - Set `ALLOWED_ORIGINS` in production

