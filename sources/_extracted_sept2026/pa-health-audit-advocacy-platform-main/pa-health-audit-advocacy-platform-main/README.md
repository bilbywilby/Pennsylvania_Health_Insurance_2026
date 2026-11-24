# PA Health Audit

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/pa-health-audit-advocacy-platform)

A production-ready full-stack application built on Cloudflare Workers and Pages. This template provides a modern React frontend with serverless API backend, complete with responsive UI components, type safety, and seamless deployment.

## Features

- **Full-Stack Ready**: React 18 SPA with Hono-powered API routes on Cloudflare Workers
- **Modern UI**: shadcn/ui components, Tailwind CSS with custom design system, dark mode support
- **Developer Experience**: Vite for fast HMR, TanStack Query for data fetching, TypeScript everywhere
- **Production Optimized**: Automatic asset bundling, error boundaries, client error reporting
- **Responsive Layout**: Collapsible sidebar, mobile-first design, animations
- **API Ready**: CORS-enabled routes, structured error handling, health checks
- **Deployment**: One-command deploy to Cloudflare with `wrangler`
- **Extensible**: Easy to add routes in `worker/userRoutes.ts`, pages in `src/pages/`

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons, TanStack Query, React Router |
| **Backend** | Cloudflare Workers, Hono, TypeScript |
| **UI/UX** | Radix UI, Framer Motion, Sonner Toasts, Headless UI |
| **Data/State** | Zustand, Immer, React Hook Form, Zod |
| **Dev Tools** | Bun, ESLint, Wrangler |
| **Other** | Date-fns, Recharts, UUID, Vaul Drawer |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended package manager)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-update/)
- Node.js (optional, Bun preferred)

### Installation

```bash
bun install
```

### Development

Start the development server with hot reload:

```bash
bun run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3000/api/health

Generate type declarations for Workers bindings:

```bash
bun run cf-typegen
```

Lint the codebase:

```bash
bun run lint
```

### Build for Production

```bash
bun run build
```

Assets are built to `dist/` and ready for deployment.

### Deployment

Deploy to Cloudflare Workers/Pages with a single command:

```bash
bun run deploy
```

This bundles your app and uploads to your Cloudflare account. Configure your `wrangler.jsonc` for custom bindings (KV, D1, R2, DOs).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/pa-health-audit-advocacy-platform)

For custom domains and preview deployments, use Wrangler directly:

```bash
wrangler deploy --name my-app-prod
wrangler deploy --branch preview-branch
```

## Usage

### Frontend Development

- **Pages**: Add routes in `src/main.tsx` router config. Example: `src/pages/Dashboard.tsx`
- **Components**: Use pre-built shadcn/ui in `src/components/ui/`. Install more with `bunx shadcn-ui@latest add <component>`
- **API Calls**: Use TanStack Query with `src/lib/errorReporter.ts` for automatic error reporting
- **Layout**: Wrap pages with `AppLayout` for sidebar: `<AppLayout><YourPage /></AppLayout>`
- **Theme**: Toggle dark/light mode with `useTheme()` hook

### Backend Development

- **API Routes**: Add endpoints in `worker/userRoutes.ts`:
  ```typescript
  app.post('/api/users', async (c) => {
    // Your logic
    return c.json({ success: true });
  });
  ```
- **Custom Middleware**: Extend Hono app in `worker/index.ts` (avoid modifying core files)
- **Bindings**: Access via `env` (e.g., `env.KV.put(...)` after configuring in `wrangler.jsonc`)

### Environment Variables

Add secrets/bindings in `wrangler.toml` or dashboard:

```toml
[[env.production.vars]]
API_KEY = "your-key"
```

## Project Structure

```
├── src/              # React app
│   ├── components/   # UI components (shadcn/ui + custom)
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utilities, error reporting
│   ├── pages/        # Page components
│   └── main.tsx      # App entrypoint
├── worker/           # Cloudflare Worker backend
│   ├── index.ts      # Core server (DO NOT MODIFY)
│   └── userRoutes.ts # Your API routes
├── dist/             # Built assets
├── wrangler.jsonc    # Cloudflare config
└── package.json      # Dependencies & scripts
```

## Customization

1. **Replace HomePage**: Edit `src/pages/HomePage.tsx` with your app
2. **Add Sidebar Links**: Update `src/components/app-sidebar.tsx`
3. **Extend API**: `worker/userRoutes.ts`
4. **Theme**: Customize `tailwind.config.js` and `src/index.css`
5. **Deploy**: `bun run deploy`

## Contributing

1. Fork the repo
2. `bun install`
3. Make changes
4. `bun run lint`
5. Submit PR

## License

MIT License. See [LICENSE](LICENSE) for details.