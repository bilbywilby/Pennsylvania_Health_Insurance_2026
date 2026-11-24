# Cloudflare Workers React Chat Demo

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/keystone-health-forensic-navigator-blueprint)

A production-ready full-stack chat application built with Cloudflare Workers backend and React frontend. Demonstrates Durable Objects for multi-tenant entity storage (users, chats, messages), indexed listing, real-time mutations, and a modern UI with Shadcn components.

## Features

- **Durable Objects for Entities**: One DO instance per user/chat with automatic indexing for listing/pagination.
- **Type-safe API**: Hono routes with full TypeScript support, shared types between frontend/backend.
- **React Frontend**: Vite-powered SPA with Tanstack Query, React Router, Shadcn UI, Tailwind CSS.
- **Seeded Demo Data**: Pre-populated users, chats, and messages for instant testing.
- **CRUD Operations**: Create/read/update/delete users, chats, and messages with concurrency-safe mutations.
- **Responsive UI**: Dark/light themes, sidebar layout, infinite scroll-ready pagination.
- **Error Handling**: Client/server error reporting, global error boundaries.
- **Production Optimized**: Code splitting, Tailwind purging, Cloudflare deployment-ready.

## Tech Stack

- **Backend**: Cloudflare Workers, Hono, Durable Objects, TypeScript
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI
- **Data**: Durable Objects (SQLite-backed), Tanstack Query
- **UI/UX**: Lucide icons, Framer Motion, Sonner toasts
- **Dev Tools**: Bun, ESLint, Wrangler

## Quick Start

1. **Clone & Install**:
   ```bash
   git clone <your-repo>
   cd keystone-forensic-na-nzhoq_ayvbmmrd0rtvxs-
   bun install
   ```

2. **Run Development**:
   ```bash
   bun dev
   ```
   Opens at `http://localhost:3000` (frontend) with hot reload. Backend APIs available at `/api/*`.

3. **Build & Preview**:
   ```bash
   bun build
   bun preview
   ```

## Local Development

- **Frontend**: `src/` – Edit React components, pages in `src/pages/`, add shadcn components via `bunx shadcn-ui@latest add <component>`.
- **Backend**: `worker/` – Add routes in `worker/user-routes.ts`, entities in `worker/entities.ts`. Core utils in `worker/core-utils.ts` (do not modify).
- **Shared Types**: `shared/` – Edit `shared/types.ts` and `shared/mock-data.ts` for seed data.
- **Type Generation**: `bun run cf-typegen` (generates `worker/env.d.ts`).
- **Linting**: `bun lint`.

**Customize**:
- Replace `src/pages/HomePage.tsx` with your app.
- Add routes in `worker/user-routes.ts` using `Entity`/`IndexedEntity` classes.
- Use `api()` helper in `src/lib/api-client.ts` for frontend API calls.

## API Endpoints

All `/api/*` endpoints return `{ success: boolean; data?: T; error?: string }`.

- `GET /api/users?cursor&limit` – List users (paginated)
- `POST /api/users` – `{ name: string }` → Create user
- `DELETE /api/users/:id` – Delete user
- `POST /api/users/deleteMany` – `{ ids: string[] }` → Bulk delete
- `GET /api/chats?cursor&limit` – List chats
- `POST /api/chats` – `{ title: string }` → Create chat
- `GET /api/chats/:chatId/messages` – List messages
- `POST /api/chats/:chatId/messages` – `{ userId: string; text: string }` → Send message

Test with `curl` or app UI.

## Deployment

Deploy to Cloudflare Workers in one command:

```bash
bun run deploy
```

Or manually:

1. Install Wrangler: `bunx wrangler@latest login`
2. Deploy: `bunx wrangler@latest deploy`
3. Assets served from `./dist` (built frontend).

**Custom Domain**: Edit `wrangler.jsonc` → `"assets"`.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/keystone-health-forensic-navigator-blueprint)

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server (frontend + proxy to worker) |
| `bun build` | Build frontend for production |
| `bun preview` | Preview production build |
| `bun deploy` | Build + deploy to Cloudflare |
| `bun lint` | Run ESLint |
| `bun run cf-typegen` | Generate Worker types |

## Project Structure

```
├── src/              # React frontend (Vite)
├── worker/           # Cloudflare Worker backend (Hono + DO)
├── shared/           # Shared types/mock data
├── tailwind.config.js # Tailwind + Shadcn config
└── wrangler.jsonc    # Worker deployment config
```

## License

MIT – See [LICENSE](LICENSE) for details.