# Render Deployment Guide

## Architecture

Render will host your **full-stack application** (Fastify server serving both frontend and backend). The Fastify server serves static files from `dist/` and handles API routes, WebSocket connections, and authentication.

### Deployment Setup

```
Full Stack: Render (Web Service)
- Fastify server handles frontend (serves static files) + backend (API + WebSocket)
- Single deployment, unified server
```

## Deployment Steps

### 1. Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select your repository and branch

### 2. Configure Service Settings

#### Basic Settings
- **Name**: `beji` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)

#### Build & Deploy
- **Build Command**: `pnpm install && pnpm build:client`
- **Start Command**: `pnpm start`

#### Environment Variables

Set these in Render dashboard under "Environment":

```
NODE_ENV=production
# PORT is automatically set by Render - do not define it manually

# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret_key

# Redis (if using external Redis)
REDIS_URL=your_redis_url

# Optional: CORS origins (comma-separated)
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

**Note:** Render will automatically set `PORT` - your server already uses `process.env.PORT || 3000` so this is handled.

### 3. Using render.yaml (Optional)

You can also use a `render.yaml` file for configuration. See `render.yaml` in the project root for an example.

### 4. Deploy

1. Click "Create Web Service"
2. Render will build and deploy your application
3. Your app will be available at `https://your-service-name.onrender.com`

## Custom Domain

1. Go to your service in Render dashboard
2. Click "Settings" → "Custom Domains"
3. Add your domain
4. Update Google OAuth redirect URI in Google Console:
   - `https://your-domain.com/authentication/oauth/google`

## Google OAuth Configuration

Update your Google OAuth redirect URIs to include:
- `https://your-service-name.onrender.com/authentication/oauth/google`
- `https://your-custom-domain.com/authentication/oauth/google` (if using custom domain)

## Redis Setup

### Option 1: Render Redis (Recommended)

1. In Render dashboard, click "New +" → "Redis"
2. Create a Redis instance
3. Get the `Redis URL` from the Redis service dashboard (format: `redis://red-xxxxx:6379`)
4. Add `REDIS_URL` environment variable to your web service
5. **Note**: Render Redis internal service uses `redis://` without TLS. The code automatically detects Render Redis (URLs containing `red-`) and connects without TLS.

**Important**: 
- The Redis URL from Render should already include authentication credentials if required
- If credentials are not in the URL, you can set `REDISCLI_AUTH` with the password (or `username:password` format)
- The application client will automatically use `REDISCLI_AUTH` if the URL doesn't contain credentials

### Option 2: External Redis

Use any Redis provider (Upstash, Redis Cloud, etc.) and set `REDIS_URL` environment variable. External providers typically use `rediss://` (with TLS) and TLS is automatically enabled for non-Render Redis URLs.

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Auto | **Automatically set by Render** - Do NOT define manually |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth Client Secret |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `REDIS_URL` | Yes | Redis connection URL (from Render Redis service) |
| `REDISCLI_AUTH` | No | Optional: Redis password or `username:password` (used if credentials not in URL) |
| `ALLOWED_ORIGINS` | No | Comma-separated list of allowed CORS origins |

## Server Architecture

The Fastify server handles:

1. **Static File Serving**: Serves built frontend from `dist/` directory
2. **API Routes**: 
   - Connect RPC endpoints (`/api/*`)
   - Authentication routes (`/authentication/*`)
   - Legacy API routes (`/api/users/*`)
3. **WebSocket**: Real-time beji sync (`/api/ws/beji-sync`)
4. **SPA Routing**: Falls back to `index.html` for client-side routes

## CORS Configuration

The server automatically:
- Allows localhost in development
- Allows configured origins from `ALLOWED_ORIGINS` in production
- Defaults to same-origin if no origin specified

For production, set `ALLOWED_ORIGINS` if you need to allow requests from specific domains.

## Testing Locally

```bash
# Start unified dev server (frontend + backend on port 3000)
pnpm dev
```

## Production Flow

1. Push code to your GitHub repository
2. Render automatically builds and deploys
3. Server serves both frontend and backend from single port
4. WebSocket connections work seamlessly
5. Static files are served efficiently by Fastify

## Benefits of Render Deployment

✅ **Unified Server**: Frontend and backend on same domain (no CORS issues)  
✅ **WebSocket Support**: Full WebSocket support for real-time features  
✅ **Simple Setup**: Single service deployment  
✅ **Auto Deploy**: Automatic deployments on git push  
✅ **Custom Domain**: Free SSL with custom domains  
✅ **Environment Variables**: Easy configuration via dashboard

## Monitoring & Logs

- View logs in Render dashboard under your service
- Real-time logs during deployment
- Historical logs for debugging

## Cost

- **Free Tier**: Available (with some limitations)
- **Starter Plan**: $7/month (recommended for production)
- **Professional Plans**: Starting at $25/month

Free tier limitations:
- Services spin down after 15 minutes of inactivity
- Slower cold starts
- Limited resources

For production, consider Starter plan for always-on service.

