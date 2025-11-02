# Next.js Cleanup Guide

## ✅ Fixed (Updated to React Router)

These components have been updated:
- ✅ `components/UserMenu.tsx` - Changed `useRouter` → `useNavigate`
- ✅ `components/StartPage.tsx` - Changed `useRouter` → `useNavigate`, removed `Route` type
- ✅ `components/start/ExistingBejisList.tsx` - Removed `Route` type
- ✅ `app/AuthSwitcher.tsx` - Removed `"use client"` directive
- ✅ `.eslintrc.cjs` - Removed `"next/core-web-vitals"`

## 📁 Files Still Needed (Keep These)

These files are still actively used:
- `app/globals.css` - Imported in `src/main.tsx`
- `app/AuthSwitcher.tsx` - Used in `src/pages/HomePage.tsx`
- `app/emoji/random.ts` - Used in `components/StartPage.tsx`
- `app/emoji/emoji_presentation_codepoints.ts` - Likely used by emoji utilities

## 🗑️ Files to Delete (Legacy Next.js Code)

These are old Next.js route handlers and pages that are no longer needed (replaced by Fastify server and React Router):

### API Routes (all replaced by Fastify server)
- `app/api/**/*` - All route handlers
  - `app/api/authentication/**`
  - `app/api/rpc/**`
  - `app/api/users/**`
  - `app/api/ws/**`
  - `app/api/websocket/**`

### Old Next.js Pages (replaced by React Router)
- `app/login/page.tsx` - Replaced by `src/pages/LoginPage.tsx`
- `app/world/[id]/page.tsx` - Replaced by `src/pages/WorldPage.tsx`
- `app/page.tsx` - Replaced by `src/pages/HomePage.tsx`
- `app/[locale]/page.tsx` - Replaced by `src/pages/HomePage.tsx`
- `app/[locale]/layout.tsx` - Replaced by React Router in `src/App.tsx`
- `app/layout.tsx` - Replaced by React Router in `src/App.tsx`

### Config Files
- `next.config.ts` - Next.js configuration
- `next-env.d.ts` - Next.js type definitions

## ⚠️ Tests That Need Updates

These tests still import from old Next.js routes and need to be updated or removed:
- `tests/world-rpc.test.ts` - Imports `app/api/rpc/world/v1/route`
- `tests/auth-oauth.test.ts` - Imports `app/api/authentication/**`
- `tests/user-bejis-api.test.ts` - Imports `app/api/users/**`
- `tests/page-import.test.ts` - Tests `app/page.tsx`
- `tests/components-ssr.test.tsx` - Has Next.js router mocks

**Action**: Update tests to test Fastify routes directly or remove them.

## 📝 Next Steps

1. **Delete legacy Next.js files** listed above
2. **Update or remove tests** that reference old Next.js routes
3. **Move emoji utilities** from `app/emoji/` to `src/lib/emoji/` or `components/emoji/` (optional cleanup)
4. **Verify imports** after cleanup to ensure nothing breaks

## Quick Cleanup Command

After reviewing and backing up, you can delete:

```bash
# Delete old Next.js API routes
rm -rf app/api

# Delete old Next.js pages
rm -rf app/login app/world app/[locale]
rm app/page.tsx app/layout.tsx

# Delete Next.js config
rm next.config.ts next-env.d.ts
```

