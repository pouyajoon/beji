# Beji

TypeScript + Next.js + Tailwind starter with strict dev rules (pnpm, ESLint, Prettier, Commitlint).

## Quick start

```bash
pnpm install
pnpm dev
```

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
