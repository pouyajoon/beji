# Beji

TypeScript + Next.js + Tailwind starter with strict dev rules (pnpm, ESLint, Prettier, Commitlint).

## Quick start

```bash
pnpm install
pnpm dev
```

## Authentication Setup

The app uses Google OAuth with JWT tokens. To set up:

1. Create a Google OAuth client ID in the [Google Cloud Console](https://console.cloud.google.com/)
2. Add the following environment variables to your `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   JWT_SECRET=your_jwt_secret_key
   ```
3. Configure the authorized redirect URIs in Google Console:
   - `http://localhost:3000/authentication/oauth/google` (development)
   - `https://beji.origamix.fr/authentication/oauth/google` (production)

Users must sign in with Google before accessing the game. JWT tokens are stored securely in httpOnly, secure, sameSite strict cookies.

## Development rules

- **Code style**: Prettier enforced; format on commit via lint-staged
- **Linting**: ESLint (Next.js, TypeScript, import order, unused imports)
- **Types**: strict TypeScript; `pnpm typecheck` must pass before merging
- **Commits**: Conventional Commits enforced by Commitlint
- **CI baseline**: run `pnpm lint`, `pnpm typecheck`, and `pnpm build`
- **Imports**: grouped and alphabetized; avoid default exports for shared utils
- **No any**: avoid unless isolated and justified; prefer precise types
- **Console**: `console.log` discouraged; allow only `console.error/warn`

## Responsive design

- Mobile-first viewport set in `app/layout.tsx`
- Tailwind configured; use `container` and responsive breakpoints

## Scripts

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm start` — run production server
- `pnpm lint` — run ESLint
- `pnpm typecheck` — run TypeScript checks
- `pnpm format` — run Prettier write

## RPC via Proto files

- Define APIs only in `proto/**.proto`. Example: `proto/echo/v1/echo.proto`.
- Generate TypeScript types/services (requires `protoc` installed):

```bash
pnpm proto:gen
```

Generated files go to `src/proto/`.
