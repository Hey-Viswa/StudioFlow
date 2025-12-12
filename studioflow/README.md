# StudioFlow

StudioFlow is a modular platform for building and scaling creative automation workflows. It couples a Vite-powered React client with an Express/MongoDB API, backing services, and optional infrastructure tooling so teams can ship new features quickly while keeping the codebase maintainable.

## Architecture

- **client/** – React single-page application (Vite, React Router, Vitest)
- **server/** – Express API with Mongoose models, service layer, BullMQ job queues
- **infra/** – Deployment and DevOps assets (Docker, nginx, IaC) *(stubbed for now)*

## Features

- Auto-Task creation from comment hashtags (#bug, #todo, #high, #critical, etc.)
- Priority parsing and color‑coded badges in task list
- Real‑time task updates via Socket.IO (`task:added` event)
- Automation hint in comment composer
- Bug fixes: NotificationBatch CastError, task fetching, merge conflict resolutions
- Updated UI for task descriptions (source link removal)
- Comprehensive documentation updates

Each area is self-contained with its own `package.json`, tooling, and scripts, making it easier to scale teams and deployments independently.

## Getting Started

### Requirements

- Node.js 18+
- npm 9+
- MongoDB instance (local or remote) for the API

### Install Dependencies

```bash
cd studioflow/client && npm install
cd ../server && npm install
```

### Run the Client

```bash
cd studioflow/client
npm run dev
```

The client runs on Vite’s default port (`5173`).

### Run the API

```bash
cd studioflow/server
npm run dev
```

Copy `.env.example` to `.env` (if present) and provide MongoDB credentials plus any third-party keys before starting the server.

## Development Workflow

1. Branch from `main` for each feature or fix.
2. Keep client and server changes in separate commits to simplify reviews.
3. Run unit and integration tests (`npm test`) before opening a pull request.
4. Use the shared `infra/` folder for environment scripts, compose files, and deployment manifests.

## Project Structure

```

├── client/
│   ├── public/           # Static assets served by Vite
│   └── src/
│       ├── api/          # Axios clients and API helpers
│       ├── components/   # Reusable UI components
│       ├── context/      # React context providers
│       ├── hooks/        # Custom hooks
│       ├── pages/        # Route-level components
│       └── utils/        # Shared utilities
├── server/
│   ├── src/
│   │   ├── config/       # Configuration loaders (env, db, S3)
│   │   ├── controllers/  # Route handlers
│   │   ├── middlewares/  # Express middleware
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routers
│   │   ├── services/     # Domain/service layer
│   │   ├── jobs/         # BullMQ background jobs
│   │   └── utils/        # Server-side helpers
│   └── tests/            # API and integration tests
└── infra/                # Docker, nginx, IaC, and scripts
```

## Testing

- `studioflow/client`: `npm test` runs Vitest in watch mode.
- `studioflow/server`: add tests under `tests/` and wire up your preferred runner (e.g., Jest, Mocha).

## Deployment

Use the `infra/` folder to define Docker images, compose stacks, Kubernetes manifests, or CI/CD workflows. Keep environment-specific configuration out of source control by relying on environment variables and secret managers.

## Contributing

1. Fork or branch from `main`.
2. Add or update tests alongside your code.
3. Run linting/formatting (`npm run lint`, if configured) before committing.
4. Open a pull request with a clear description of the changes and testing performed.

## License

This project is released under the MIT License. See `LICENSE` for details.
