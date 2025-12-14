# StudioFlow Technical Documentation

**Version:** 2.0.0  
**Last Updated:** December 14th, 2025

---

## 1. Executive Summary

StudioFlow is a **Client Collaboration & Project Management Platform** designed for creative agencies and freelancers. It streamlines the lifecycle of creative projects—from file management and feedback looping to invoicing and payments. Use of role-based access control (RBAC) ensures distinct experiences for **Agency Owners**, **Team Members**, and **Clients**.

Key capabilities include:

- **Project & Task Management** (Kanban, Lists, Priority logic)
- **Advanced File Management** (Versions, Showcase Mode, S3/R2 Storage)
- **Financial Module** (Invoices, Razorpay Integration, Subscriptions)
- **Real-time Collaboration** (Comments, Auto-Task Creation, Notifications)
- **Automated Workflows** (Webhook handling, KPI Aggregation)

---

## 2. System Architecture

The application follows a modern **MERN** stack architecture (MongoDB, Express, React, Node.js) with specialized micro-services for background jobs and real-time events.

### 2.1 Technology Stack

- **Frontend**: React 18, Vite, TailwindCSS, Framer Motion, Radix UI.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose ODM).
- **Real-time**: Socket.IO (Events: `task:added`, `project:updated`, `notification:new`).
- **Queues**: BullMQ + Redis (for Email Batches, File Processing).
- **Storage**: AWS S3 Compatible (supports AWS S3 and Cloudflare R2).
- **Auth**: Clerk (Identity Management & Session handling).

### 2.2 Directory Structure

```
studioflow/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/     # Reusable UI Blocks (Files, Invoices, Tasks)
│   │   ├── pages/          # Route Views (ProjectDetail, Dashboard)
│   │   ├── lib/            # Utilities (API wrapper, Formatters)
│   │   └── hooks/          # Custom Hooks (useAuth, useSocket)
│
├── server/                 # Backend API
│   ├── src/
│   │   ├── config/         # DB, Storage, Payment configurations
│   │   ├── controllers/    # Request Handlers (Logic Layer)
│   │   ├── models/         # Mongoose Schemas (Data Layer)
│   │   ├── routes/         # Express Route Definitions
│   │   ├── services/       # Business Logic (Automation, Notifications)
│   │   └── utils/          # Helpers (Permissions, Validators)
│   ├── scripts/            # Maintenance & Verification Scripts
│
└── infra/                  # Deployment logic (Docker, Nginx)
```

---

## 3. Core Modules & Data Models

### 3.1 Project Management

**Models**: `Project`, `Task`, `ProjectMember`

- **Projects**: The core container. Supports statuses (Active, Completed, Archived).
- **Tasks**: Linked to projects. Supports tagging via comments (e.g., `#critical`).
- **RBAC**: `ProjectMember` links Users to Projects with roles (`owner`, `team_member`, `client`).

### 3.2 File Ecosystem

**Models**: `ProjectFile`, `ShowcaseItem`

- **Versioning**: Files are not overwritten; new versions are created (`version: 2`), linked by `baseFileId`.
- **Cloud Storage**: Files are uploaded to S3/R2. The backend generates **Signed URLs** (`getSignedDownloadUrl`) for secure access.
- **Showcase Mode**:
  - A public-facing, visually immersive page to share assets with non-users.
  - **Video Streaming**: Uses signed URLs with `Content-Type` headers to allow browser-native streaming for video files, bypassing the need for heavy proxying.
  - Gate: `ENABLE_SHOWCASE_MODE` env var.

### 3.3 Financial Engine

**Models**: `ProjectInvoice`, `ProjectBillingConfig`, `PaymentThread`

- **Invoicing**: Create, Send, and Track invoices. Supports PDF generation (via React-PDF).
- **Payments**: Integrated with **Razorpay**.
  - **Order Flow**: Invoice Created -> Razorpay Order Generated -> Payment Gateway -> Webhook -> Invoice Marked 'Paid'.
- **Subscriptions**: Users (Agencies) subscribe to StudioFlow tiers (Starter, Pro) handled via `SubscriptionController`.

### 3.4 Automation & Intelligence

**Models**: `AutomationRule`, `WebhookEvent`

- **Comment-to-Task**: Writing "Please fix this #bug" in a comment automatically:
  1. Parsing the hashtag.
  2. Creates a `Task` with `label: bug`.
  3. Notifies the assignee.
- **Smart Notifications**:
  - Batching: `NotificationBatchWorker` groups distinct events to prevent email spam.
  - Digiests: Daily summaries for less urgent updates.

---

## 4. Key Workflows

### 4.1 Showcase Video Streaming

1. **Upload**: User uploads `demo.mp4`. File saved to S3; `ProjectFile` record created with `storageKey` and `mimeType: video/mp4`.
2. **Publish**: User clicks "Add to Showcase". `ShowcaseItem` created with unique `slug`.
3. **Playback**:
   - Visitor hits `/showcase/:slug`.
   - Server looks up `ShowcaseItem` -> `ProjectFile`.
   - Server checks `storageProvider` (S3).
   - Server generates a **Signed URL** (valid for 1 hour).
   - Server redirects the video player request to this signed URL.
   - Browser streams content directly from S3.

### 4.2 Webhook Handling (Razorpay)

1. **Trigger**: Payment success on Razorpay.
2. **Receive**: `paymentController.handleRazorpayWebhook` receives POST.
3. **Verify**: Check signature using `RAZORPAY_WEBHOOK_SECRET`.
4. **Action**:
   - `invoice.payment.captured` event.
   - Find `ProjectInvoice` by `orderId`.
   - Update Status to `paid`.
   - Create `Entitlement` record (if applicable).
   - Trigger `socket.emit('invoice:updated')` to refresh client UI instantly.

---

## 5. Security & Permissions

StudioFlow uses a granular RBAC system defined in `utils/permissions.js`.

| Feature        | Owner | Team Member |      Client      |
| :------------- | :---: | :---------: | :--------------: |
| Create Project |  ✅   |     ❌      |        ❌        |
| View Files     |  ✅   |     ✅      | ✅ (Shared only) |
| Upload Files   |  ✅   |     ✅      |        ❌        |
| Approve Files  |  ✅   |     ❌      |        ✅        |
| Manage Billing |  ✅   |     ❌      |        ❌        |
| Delete Project |  ✅   |     ❌      |        ❌        |

---

## 6. Deployment Guide

### 6.1 Prerequisites

- **Node.js** v18+
- **MongoDB** Atlas (or local)
- **Redis** (Optional, for Background Jobs)
- **S3 Bucket** (AWS or Cloudflare R2)

### 6.2 Environment Variables (.env)

**Application Core**

- `NODE_ENV`: `production`
- `PORT`: `3000` (Server), `5173` (Client)
- `FRONTEND_URL`: URL of the deployed client
- `VITE_API_URL`: URL of the deployed server API

**Database**

- `MONGODB_URI`: `mongodb+srv://...`
- `REDIS_URL`: `redis://...` (Optional if `ENABLE_REDIS_QUEUE=false`)

**Authentication (Clerk)**

- `CLERK_SECRET_KEY`: `...`
- `CLERK_PUBLISHABLE_KEY`: `...`
- `CLERK_WEBHOOK_SECRET`: `...` (For user sync)

**File Storage (S3/R2)**

- `STORAGE_PROVIDER`: `s3` (or `r2`)
- `AWS_ACCESS_KEY_ID`: `...`
- `AWS_SECRET_ACCESS_KEY`: `...`
- `AWS_REGION`: `auto` (for R2) or `us-east-1`
- `AWS_BUCKET_NAME`: `...`
- `ENABLE_SHOWCASE_MODE`: `true` (REQUIRED for Showcase)

**Payments (Razorpay)**

- `RAZORPAY_KEY_ID`: `...`
- `RAZORPAY_KEY_SECRET`: `...`
- `RAZORPAY_WEBHOOK_SECRET`: `...`

### 6.3 Build Steps

1. **Server**:
   ```bash
   cd server
   npm install
   npm start
   ```
2. **Client**:
   ```bash
   cd client
   npm install
   npm run build
   # Serve 'dist' folder via Nginx or Static Host
   ```

---

## 7. Future Roadmap

- **Infrastructure as Code (IaC)**: Terraform scripts for AWS deployment.
- **Mobile App**: React Native bridge.
- **AI Analytics**: Predictive project completion dates based on task velocity.
