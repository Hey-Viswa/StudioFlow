# StudioFlow Technical Documentation

## Overview

StudioFlow is a modular platform for building and scaling creative automation workflows. It combines a Vite‑powered React client with an Express/MongoDB API, background job processing via BullMQ, and optional infrastructure tooling.

## Architecture

- **client/** – React single‑page application (Vite, React Router, Vitest)
- **server/** – Express API with Mongoose models, service layer, BullMQ job queues
- **infra/** – Deployment and DevOps assets (Docker, nginx, IaC) _(stubbed for now)_

## New Features

### Auto‑Task Creation

- Users can create tasks directly from comment hashtags such as `#bug`, `#todo`, `#high`, `#critical`, etc.
- The system parses the comment, extracts the title and description, and creates a task with the appropriate label.

### Priority Parsing & UI Badges

- Priority hashtags (`#critical`, `#urgent`, `#high`, `#medium`, `#low`) set the task priority.
- The task list displays color‑coded badges (Red = Urgent, Orange = High, Blue = Medium, Slate = Low).

### Real‑time Task Updates

- Integrated **Socket.IO** on the server side (`getIO` from `config/socket.js`).
- Emits a `task:added` event whenever an auto‑task is created.
- The frontend (`TasksTab.jsx`) listens for this event and updates the task list instantly.

### Automation Hint in Comment Composer

- Added a user‑facing hint near the comment input area that lists supported automation hashtags, encouraging discoverability.

### KPI & Dashboard Analytics

- **Dynamic Project Stats**: The backend utilizes MongoDB Aggregation pipelines to calculate `ProjectInvoice` stats (pending, overdue) and `Task` completion rates on-the-fly, ensuring accurate real-time data.
- **Real-time Trends**: Dashboard trends for "Active" and "Completed" projects are calculated by comparing current counts against 30-day historical data derived from `createdAt` and `updatedAt` timestamps.
- **Usage Limits**: The "Free Plan" usage card independently validates project counts against the user's subscription tier logic in `projectController.js`.

### Smart Notifications 2.0

- **Intelligent Grouping**: The `notificationBatchWorker.js` groups multiple notifications for the same task or context into a single batch to reduce email noise.
- **Daily Digests**: A scheduled background job aggregates 24 hours of activity into a single summary email for users with the 'Daily' frequency setting.
- **Client Defaults**: New client accounts are automatically initialized with cleaner notification defaults (Muted: File Uploads, Project Updates) via `notificationRules.js`.

### Client Showcase Mode

- **Public Portfolio**: Project owners can publish files/assets to a beautiful, public-facing landing page (`/showcase/:slug`).
- **Video Streaming**: Supports high-performance video streaming directly from Cloud Storage (S3/R2) using signed streaming URLs, bypassed the need for proxying large binaries.
- **Security Gating**: Features are strictly gated behind `ENABLE_SHOWCASE_MODE` feature flag and require projects to have no unpaid invoices.

### Bug Fixes & Improvements

- Fixed `NotificationBatch` CastError by changing `userId` to `String`.
- Corrected task fetching API to return `{ tasks, stats }`.
- Resolved merge conflicts and ensured consistent UI behavior across branches.
- Cleaned up task descriptions by removing legacy "Source Comment" links.
- **Video Playback**: Resolved black screen issues by implementing proper MIME-type handling and direct signed URL redirection for Cloud Storage files.

## API Endpoints (selected)

- `POST /api/comments` – Create a comment; triggers auto‑task logic if hashtags are present.
- `GET /api/projects/:projectId/tasks` – Retrieves tasks with priority metadata.
- `GET /api/notifications` – Returns notification batches for the logged‑in user.
- `POST /api/showcase/publish` – Publishes a file to the public showcase (Owner Only).

## Real‑time Architecture

1. Client connects to Socket.IO server on page load.
2. When `automationService` creates a task, it calls `io.emit('task:added', newTask)`.
3. `TasksTab.jsx` registers `socket.on('task:added', handler)` to prepend the new task to the UI list.

## UI Enhancements

- **TasksTab.jsx** now renders priority badges with distinct colors.
- Comment composer (`CommentThread.jsx`) displays an automation hint.
- Task description regex cleans up legacy source links for a cleaner UI.
- **Showcase Player**: Enhanced video player with buffering optimizations (`preload="auto"`), disabled downloads, and blocked context menus.

## Deployment

- Use the `infra/` folder for Docker, Docker‑Compose, or Kubernetes manifests.
- Environment variables are loaded from `.env`; ensure `MONGODB_URI`, `REDIS_URL`, and `CLERK_API_KEY` are set.
- **New Variable**: `ENABLE_SHOWCASE_MODE=true` is required to enable the Showcase feature in production.
- **Storage**: Ensure `STORAGE_PROVIDER`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`, and `AWS_REGION` are configured for video streaming.
- Run `npm run dev` in both `client/` and `server/` for local development.

---

_Documentation updated on 2025‑12‑14._
