# Netlify Deployment Guide

## Architecture

Netlify will serve your **frontend only** (the Vite-built React app). The **Fastify backend server** needs to be deployed separately.

### Recommended Setup

```
Frontend: Netlify (Static hosting)
Backend:  Separate service (Railway, Render, Fly.io, etc.)
```

## Frontend Deployment (Netlify)

### 1. Build Configuration

The `netlify.toml` is configured to:
- Build command: `pnpm build:client`
- Publish directory: `dist`
- Handle SPA routing (all routes redirect to `index.html`)

### 2. Environment Variables

In Netlify dashboard, set:
- `VITE_API_URL` - Your backend API URL (e.g., `https://your-api.example.com`)
- `VITE_WS_URL` - Your WebSocket server URL (e.g., `wss://your-api.example.com`)

**Note:** In Vite, only variables prefixed with `VITE_` are exposed to the client.

### 3. Deploy

#### Via Netlify Dashboard:
1. Connect your GitHub repository
2. Netlify will auto-detect the `netlify.toml` configuration
3. Add environment variables in Site settings
4. Deploy

#### Via Netlify CLI:
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## Backend Deployment (Separate Service)

The Fastify server (`server.ts`) needs to be deployed to a service that supports:
- Long-running Node.js processes
- WebSocket connections
- Environment variables

### Recommended Platforms:

#### Railway
```bash
railway init
railway up
```

#### Render
- Create a new Web Service
- Point to your repository
- Build command: `pnpm install && pnpm build:client`
- Start command: `pnpm start`

#### Fly.io
```bash
fly launch
fly deploy
```

### Backend Environment Variables

Set these on your backend service:
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret_key
REDIS_URL=your_redis_url
NODE_ENV=production
PORT=3000
```

## Client Configuration

Update your client code to use environment variables for API URLs:

```typescript
// Example in your API client code
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
```

## CORS Configuration

Make sure your Fastify server allows requests from your Netlify domain:

```typescript
// In server.ts
import fastifyCors from '@fastify/cors';

await fastify.register(fastifyCors, {
  origin: [
    'http://localhost:3000',
    'https://your-netlify-site.netlify.app',
    'https://your-custom-domain.com',
  ],
  credentials: true,
});
```

The CORS configuration automatically allows localhost in development mode.

## Testing Locally

```bash
# Start unified dev server (frontend + backend on port 3000)
pnpm dev
```

## Production Flow

1. **Backend**: Deploy Fastify server to Railway/Render/Fly.io
2. **Frontend**: Get backend URL and set `VITE_API_URL` in Netlify
3. **Frontend**: Deploy to Netlify
4. **CORS**: Update backend CORS to allow Netlify domain

## Benefits of This Approach

✅ **Simple**: Standard static hosting for frontend
✅ **Flexible**: Backend can scale independently
✅ **WebSocket Support**: Full WebSocket support on backend
✅ **Cost Effective**: Netlify free tier for frontend, pay only for backend usage
