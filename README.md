# Beji

TypeScript + Vite + React + Fastify starter with strict dev rules (pnpm, ESLint, Prettier, Commitlint).

## Quick start

```bash
pnpm install
pnpm dev
```

This will start:
- A single server on `http://localhost:3000` serving both frontend and backend
  - In development: Vite handles frontend with HMR, Fastify handles API routes
  - In production: Fastify serves static files and API routes

## Architecture

- **Frontend**: Vite + React + React Router
- **Backend**: Fastify with WebSocket support
- **RPC**: Protocol Buffers via Connect RPC
- **State Management**: Jotai
- **Styling**: Tailwind CSS

## Authentication Setup

The app uses Google OAuth with JWT tokens. To set up:

1. Create a Google OAuth client ID in the [Google Cloud Console](https://console.cloud.google.com/)
2. Add the following environment variables to your `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   JWT_SECRET=your_jwt_secret_key
   ```
3. Configure the authorized redirect URIs in Google Console:
   - `http://localhost:3000/authentication/oauth/google` (development)
   - `https://your-domain.com/authentication/oauth/google` (production)

Users must sign in with Google before accessing the game. JWT tokens are stored securely in httpOnly, secure, sameSite strict cookies. The Google Client ID is served to clients via a public RPC endpoint, eliminating the need for NEXT_PUBLIC_ environment variables.

## Development rules

- **Code style**: Prettier enforced; format on commit via lint-staged
- **Linting**: ESLint (TypeScript, import order, unused imports)
- **Types**: strict TypeScript; `pnpm typecheck` must pass before merging
- **Commits**: Conventional Commits enforced by Commitlint
- **CI baseline**: run `pnpm lint`, `pnpm typecheck`, and `pnpm build`
- **Imports**: grouped and alphabetized; avoid default exports for shared utils
- **No any**: avoid unless isolated and justified; prefer precise types
- **Console**: `console.log` discouraged; allow only `console.error/warn`

## Scripts

- `pnpm dev` — start unified dev server (Vite + Fastify on port 3000)
- `pnpm dev:client` — start Vite dev server only (legacy, use `pnpm dev` instead)
- `pnpm dev:server` — start unified dev server (alias for `pnpm dev`)
- `pnpm build` — build for production
- `pnpm build:client` — build frontend only
- `pnpm start` — start production server
- `pnpm preview` — preview production build

## Production Deployment

### Option 1: Render (Recommended)

Render hosts your full-stack application (Fastify server serving both frontend and backend).

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed instructions.

**Features:**
- Single unified server (frontend + backend)
- Full WebSocket support
- Automatic deployments
- Free SSL with custom domains

### Option 2: Self-hosted (Fastify server)

1. Build the frontend: `pnpm build:client`
2. The built files are in `dist/`
3. The Fastify server serves static files from `dist/` in production
4. Start the server: `NODE_ENV=production pnpm start`

## Project Structure

- `src/` - Source files (pages, components, lib)
- `components/` - React components
- `server.ts` - Fastify server with API routes
- `vite.config.ts` - Vite configuration
- `proto/` - Protocol Buffer definitions
- `src/proto/` - Generated TypeScript from `.proto`
