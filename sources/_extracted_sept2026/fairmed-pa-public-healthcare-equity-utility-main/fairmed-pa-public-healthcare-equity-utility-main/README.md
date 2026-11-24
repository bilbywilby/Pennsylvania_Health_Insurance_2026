# Fairmed PA

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/fairmed-pa-public-healthcare-equity-utility)

A modern full-stack application built on Cloudflare Workers, featuring a React frontend with shadcn/ui, Hono backend, and Durable Objects for persistent state management. Designed for rapid development with end-to-end TypeScript, TanStack Query for data synchronization, and a beautiful, responsive UI.

## Features

- **Full-Stack TypeScript**: Seamless type-sharing between frontend and backend via `@shared/*` paths.
- **Cloudflare Durable Objects**: Built-in stateful storage with counter and demo item CRUD operations.
- **Modern React UI**: shadcn/ui components, Tailwind CSS, Lucide icons, and animations.
- **API-First Backend**: Hono routing with CORS, logging, error handling, and health checks.
- **Data Management**: TanStack Query for optimistic updates, caching, and mutations.
- **Theme Support**: Light/dark mode with persistence.
- **Error Handling**: Global error boundaries and client-side error reporting.
- **Development Ready**: Hot reload, type generation, and one-command deployment.
- **Responsive Design**: Mobile-first with sidebar layout support.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query, React Router, Framer Motion, Sonner (toasts), Zustand
- **Backend**: Cloudflare Workers, Hono, Durable Objects
- **Styling**: Tailwind CSS (with custom animations and gradients), shadcn/ui
- **Utilities**: clsx, tw-merge, date-fns, UUID, Zod
- **Dev Tools**: Bun, ESLint, Wrangler

## Prerequisites

- [Bun](https://bun.sh/) (recommended package manager)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Node.js (optional, for fallback)

## Installation

1. Clone the repository:
   ```
   git clone <your-repo-url>
   cd fairmed-pa-0edtgvfeiq3kfkn3e8kay
   ```

2. Install dependencies:
   ```
   bun install
   ```

3. Generate Worker types (if deploying):
   ```
   bun run cf-typegen
   ```

## Development

- Start the development server (frontend + Worker proxy):
  ```
  bun dev
  ```
  Opens at `http://localhost:3000` (or `$PORT`).

- Lint the codebase:
  ```
  bun lint
  ```

- Build for production:
  ```
  bun build
  ```

Access API endpoints at `/api/*` (e.g., `/api/health`, `/api/demo`, `/api/counter`).

**Custom Routes**: Extend functionality in `worker/userRoutes.ts` without modifying `worker/index.ts`.

**Demo Features**:
- GET `/api/demo`: Fetch persistent demo items.
- POST `/api/demo`: Add new item.
- Counter endpoints: `/api/counter`, `/api/counter/increment`.
- Client error reporting: POST `/api/client-errors`.

## Deployment

Deploy to Cloudflare Workers with Pages integration:

1. Login to Cloudflare:
   ```
   wrangler login
   ```

2. Deploy:
   ```
   bun deploy
   ```
   (Builds frontend assets and deploys Worker.)

Or manually:
```
bun build
wrangler deploy
```

Your app will be available at `https://fairmed-pa-0edtgvfeiq3kfkn3e8kay.<your-subdomain>.workers.dev`.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/fairmed-pa-public-healthcare-equity-utility)

**Production Tips**:
- Assets are served as a SPA via `"not_found_handling": "single-page-application"`.
- Durable Objects migrate automatically.
- Enable Observability in `wrangler.jsonc`.

## Customizing the App

- **UI**: Edit `src/pages/HomePage.tsx` and use shadcn components from `@/components/ui/*`.
- **Layout**: Use `AppLayout` from `@/components/layout/AppLayout.tsx` for sidebar.
- **Theme**: Toggle via `ThemeToggle`.
- **Routes**: Add to `src/main.tsx` router.
- **API**: Extend `worker/userRoutes.ts`.
- **Shared Types**: Define in `shared/types.ts`.

## Contributing

1. Fork the repo.
2. Create a feature branch (`bun dev`).
3. Commit changes (`git commit -m "feat: ..."`).
4. Open a Pull Request.

## License

MIT License. See [LICENSE](LICENSE) for details.