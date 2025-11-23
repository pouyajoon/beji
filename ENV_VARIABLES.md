# Environment Variables

This document lists all environment variables used in the Beji application.

## Required Variables

These variables must be set for the application to function properly.

### `REDISCLI_AUTH`
- **Required**: Yes
- **Description**: Redis password OR full connection URL
- **Format**: 
  - **Option 1**: Full URL - `redis://host:port` or `rediss://host:port` (with TLS)
  - **Option 2**: Password only - used with `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`
- **Example**: 
  - Full URL: `redis://red-xxxxx:6379` or `rediss://username:password@host:port`
  - Password only: `PONgj8skX7j9qXzmQSMRPEO2YMoICq1p` (used with REDIS_HOST, REDIS_PORT, REDIS_USERNAME)
- **Used in**: `src/lib/redis/client.ts`
- **Note**: 
  - If it starts with `redis://` or `rediss://`, it's treated as a full URL
  - Otherwise, it's treated as a password and requires `REDIS_HOST` and `REDIS_PORT` (and optionally `REDIS_USERNAME`)
  - Render.com Key Value provides the password in `REDISCLI_AUTH` when you link a service

### `REDIS_HOST`
- **Required**: Yes* (if `REDISCLI_AUTH` is a password, not a URL)
- **Description**: Redis hostname
- **Format**: String (hostname or IP address)
- **Example**: `frankfurt-keyvalue.render.com`
- **Used in**: `src/lib/redis/client.ts`
- **Note**: Required when `REDISCLI_AUTH` is a password (not a full URL)

### `REDIS_PORT`
- **Required**: Yes* (if `REDISCLI_AUTH` is a password, not a URL)
- **Description**: Redis port number
- **Format**: Number (as string)
- **Example**: `6379`
- **Used in**: `src/lib/redis/client.ts`
- **Note**: Required when `REDISCLI_AUTH` is a password (not a full URL)

### `REDIS_USERNAME`
- **Required**: No
- **Description**: Redis username for authentication
- **Format**: String
- **Example**: `red-d4g9n4hr0fns739f93vg`
- **Used in**: `src/lib/redis/client.ts`
- **Note**: Optional - only used when `REDISCLI_AUTH` is a password (not a full URL)

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

# Required - Redis Configuration (choose one option)

# Option 1: REDISCLI_AUTH as full URL
REDISCLI_AUTH=redis://red-xxxxx:6379
# Or with authentication:
# REDISCLI_AUTH=redis://default:password@red-xxxxx:6379
# Or for external Redis with TLS:
# REDISCLI_AUTH=rediss://username:password@redis.example.com:6380

# Option 2: REDISCLI_AUTH as password (Render Key Value style)
REDISCLI_AUTH=PONgj8skX7j9qXzmQSMRPEO2YMoICq1p
REDIS_HOST=frankfurt-keyvalue.render.com
REDIS_PORT=6379
REDIS_USERNAME=red-d4g9n4hr0fns739f93vg

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

