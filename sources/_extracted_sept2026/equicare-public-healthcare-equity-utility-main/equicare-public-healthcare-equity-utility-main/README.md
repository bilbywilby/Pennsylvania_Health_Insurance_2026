# Cloudflare Workers React Starter Template

A production-ready full-stack application template built on Cloudflare Workers with Durable Objects for scalable, multi-tenant entities. Features a modern React frontend with TypeScript, Tailwind CSS, shadcn/ui components, TanStack Query for data fetching, and a Hono-powered API backend.

**[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/equicare-public-healthcare-equity-utility)**

## Features

- **Durable Objects for Entities**: One DO per entity (e.g., Users, Chats) with automatic indexing for listing/pagination.
- **Type-Safe API**: Shared types between frontend and backend with full TypeScript support.
- **React 18 + Vite**: Fast development server with hot module replacement.
- **Modern UI**: shadcn/ui components, Tailwind CSS, dark mode support.
- **Data Fetching**: TanStack Query integration with optimistic updates.
- **Real-time Chat Demo**: Users, chat boards, and messages with seed data.
- **Cloudflare Native**: Workers, Durable Objects, SPA asset handling.
- **Deployment Ready**: One-command deploy to Cloudflare.

## Tech Stack

- **Backend**: Cloudflare Workers, Hono, Durable Objects
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Router, Zustand, Framer Motion
- **Utilities**: Immer, Zod, Lucide Icons, Sonner (toasts)
- **Dev Tools**: Bun, Wrangler, ESLint, Prettier

## Quick Start

1. **Install Dependencies**:
   ```bash
   bun install
   ```

2. **Start Development Server**:
   ```bash
   bun dev
   ```
   Opens at `http://localhost:3000` (or `$PORT`).

3. **Deploy to Cloudflare**:
   ```bash
   bun deploy
   ```

## Local Development

- **Frontend**: `bun dev` – Serves React app with Vite.
- **Worker Dev** (API only): Install Wrangler globally (`bun add -g wrangler`), then `wrangler dev`.
- **Type Generation**: `bun cf-typegen` – Updates `worker.d.ts` with bindings.
- **Linting**: `bun lint`
- **Preview**: `bun preview`

### API Testing

The backend exposes REST endpoints:
- `GET /api/users` – List users (paginated)
- `POST /api/users` – Create user `{ name: string }`
- `GET /api/chats` – List chats
- `POST /api/chats` – Create chat `{ title: string }`
- `GET /api/chats/:chatId/messages` – List messages
- `POST /api/chats/:chatId/messages` – Send message `{ userId: string, text: string }`

Seed data auto-populates on first request.

## Deployment

1. **Build Assets**:
   ```bash
   bun build
   ```

2. **Deploy**:
   ```bash
   bun deploy
   ```
   Deploys Worker + static assets to Cloudflare.

Configure `wrangler.jsonc` with your account ID if needed. Assets are served as SPA (single-page application).

**[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/equicare-public-healthcare-equity-utility)**

## Project Structure

```
├── shared/          # Shared types & mock data
├── src/             # React frontend
│   ├── components/  # UI components (shadcn/ui + custom)
│   ├── hooks/       # Custom hooks (theme, mobile)
│   ├── lib/         # Utilities (API client, utils)
│   └── pages/       # Route pages
├── worker/          # Cloudflare Worker backend
│   ├── core-utils.ts # Entity base classes (DO NOT MODIFY)
│   ├── entities.ts  # UserEntity, ChatBoardEntity
│   └── user-routes.ts # Add custom routes here
└── ...              # Configs (tsconfig, tailwind, wrangler)
```

## Customization

- **New Entities**: Extend `IndexedEntity` in `worker/entities.ts`.
- **New Routes**: Add to `worker/user-routes.ts`.
- **UI Changes**: Edit `src/pages/HomePage.tsx` or add routes in `src/main.tsx`.
- **Sidebar**: Customize `src/components/app-sidebar.tsx`.
- **Theme**: Toggle via `ThemeToggle` component.

## Environment Variables

None required. All state managed via Durable Objects.

## Contributing

1. Fork & clone.
2. `bun install`
3. `bun dev`
4. Submit PR.

## License

MIT – See [LICENSE](LICENSE) (add if needed).