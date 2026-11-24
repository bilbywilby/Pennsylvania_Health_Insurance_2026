# Status Pulse

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/statuspulse-service-health-incident-reporting-dashboard-beta)

A modern, full-stack status monitoring dashboard built on Cloudflare Workers. This template provides a production-ready React frontend with Tailwind CSS, shadcn/ui components, and a Hono-powered API backend, all optimized for Cloudflare deployment.

## Features

- **Full-Stack Architecture**: React 18 SPA with React Router, TanStack Query, and a type-safe Hono API on Cloudflare Workers.
- **Modern UI**: shadcn/ui components, Tailwind CSS with custom design system, dark mode, animations, and responsive design.
- **Developer Experience**: Hot reload, TypeScript everywhere, ESLint, automatic error reporting, and theme support.
- **Performance Optimized**: Vite bundling, Cloudflare Pages integration, and Workers for edge APIs.
- **Production Ready**: CORS, logging, health checks, error boundaries, and client-side error reporting.
- **Extensible**: Easy to add routes in `worker/userRoutes.ts`, pages in `src/pages/`, and components in `src/components/`.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide icons, React Router, TanStack Query, Zustand, Framer Motion, Sonner toasts.
- **Backend**: Cloudflare Workers, Hono, TypeScript.
- **UI/UX**: Radix UI primitives, class-variance-authority, Tailwind Merge.
- **Tools**: Bun (package manager), Wrangler (deployment), ESLint, Prettier.
- **Other**: Immer, Zod validation, Date-fns, Recharts.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed (≥1.0)
- [Cloudflare CLI (Wrangler)](https://developers.cloudflare.com/workers/wrangler/install/) installed and authenticated (`wrangler login`)
- Node.js types for Workers: `bunx wrangler types`

### Installation

1. Clone the repository:
   ```
   git clone <your-repo-url>
   cd status-pulse-9ghqr7ykm2or5wfda5pwz
   ```

2. Install dependencies:
   ```
   bun install
   ```

### Development

- Start the development server (frontend + Workers proxy):
  ```
  bun dev
  ```
  Opens at `http://localhost:3000` (or `$PORT`).

- Lint the codebase:
  ```
  bun lint
  ```

- Generate Workers types:
  ```
  bun cf-typegen
  ```

### Build and Preview

- Build for production:
  ```
  bun build
  ```

- Preview the production build:
  ```
  bun preview
  ```

## Usage

- **Frontend Development**: Edit `src/pages/`, `src/components/`. Hot reload works automatically.
- **API Routes**: Add endpoints in `worker/userRoutes.ts`. Example:
  ```ts
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'World' } }));
  ```
  Access at `/api/test`.
- **Custom Pages**: Update `src/main.tsx` router. Use `AppLayout` for sidebar layouts.
- **State Management**: Use Zustand stores or TanStack Query for data fetching.
- **Theming**: Toggle dark/light mode with `ThemeToggle`. Custom CSS variables in `src/index.css`.
- **Error Handling**: Client errors auto-report to `/api/client-errors`.

Test the health endpoint: `curl http://localhost:3000/api/health`.

## Deployment

Deploy to Cloudflare Pages + Workers with one command:

```
bun deploy
```

This builds the frontend assets and deploys the Worker. Your app will be live at `https://<project>.pages.dev`.

Alternatively:

1. Build assets: `bun build`
2. Deploy manually: `wrangler deploy`

Configure your project in `wrangler.jsonc`. Assets are served as a SPA with API routes proxied through Workers.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/statuspulse-service-health-incident-reporting-dashboard-beta)

## Project Structure

```
├── src/              # React frontend
│   ├── components/   # UI components (shadcn/ui + custom)
│   ├── pages/        # Page components
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utilities
├── worker/           # Cloudflare Workers backend
│   ├── index.ts      # Core router (DO NOT EDIT)
│   └── userRoutes.ts # Add your API routes here
├── tailwind.config.js # Design system
└── wrangler.jsonc    # Cloudflare config
```

## Contributing

1. Fork the repo and create a feature branch.
2. Install dependencies with `bun install`.
3. Make changes and run `bun lint`.
4. Test with `bun dev`.
5. Submit a PR.

## License

MIT License. See [LICENSE](LICENSE) for details.