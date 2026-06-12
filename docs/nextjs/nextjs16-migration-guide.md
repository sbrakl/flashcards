# Next.js 16: Middleware to Proxy Migration Guide

## Overview
- **Next.js 16** renames `middleware` to `proxy`
- The functionality remains the same, but the naming clarifies its purpose
- Deprecation: `middleware` file convention is deprecated and renamed to `proxy`

## Why the Change
- **Naming Clarity**: "Middleware" is often confused with Express.js middleware
- **Better Purpose**: "Proxy" clarifies that it's a network boundary in front of the app
- **Edge Runtime**: Proxy runs at the Edge Runtime (closer to the client)
- **Future Direction**: Next.js is moving toward better APIs with cleaner ergonomics

## Migration Steps

### Automated Migration
Use the codemod to automatically migrate your project:
```bash
npx @next/codemod@latest middleware-to-proxy .
```

### Codemod Changes
The codemod handles:
1. Renames `middleware.<extension>` to `proxy.<extension>` (e.g., `middleware.ts` → `proxy.ts`)
2. Renames named export `middleware` to `proxy`
3. Renames config properties:
   - `experimental.middlewarePrefetch` → `experimental.proxyPrefetch`
   - `experimental.middlewareClientMaxBodySize` → `experimental.proxyClientMaxBodySize`
   - `experimental.externalMiddlewareRewritesResolve` → `experimental.externalProxyRewritesResolve`
   - `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`

### Manual Migration Example
```diff
// middleware.ts -> proxy.ts

- export function middleware() {
+ export function proxy() {
    return NextResponse.next()
  }
```

## File Location
- Create `proxy.ts` (or `.js`) at project root or `src/` (same level as `pages` or `app`)
- If using custom `pageExtensions` (e.g., `.page.ts`), name it `proxy.page.ts` or `proxy.page.js`

## Key Proxy Features
- Runs code BEFORE request is completed
- Supports modifying headers, rewriting, redirecting
- Uses `NextRequest` and `NextResponse` APIs
- Supports `config.matcher` for path filtering
- Defaults to Edge Runtime (can also use Node.js)
- Only one `proxy` file per project (organize logic into separate modules)

## Common Use Cases
1. Modifying headers for pages
2. A/B testing with rewrites
3. Programmatic redirects based on request properties
4. Authentication checks (optimistic)
5. Logging and analytics

## Important Notes
- Proxy is NOT for slow data fetching
- Should NOT be used as full session management solution
- Only one `proxy.ts` file per project is supported
- Can still organize logic into separate modules
- Platform support varies (not supported for static export)
