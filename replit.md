# Employee Master — Workspace

## Overview

A full-stack Employee Management System built as a pnpm monorepo. Manages employee records and their access across internal services (VPN, Jira, MailVault, FTP, Acronis, Tata Tele, Branch File Station, Assetcuez).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Backend**: Express 5 (`artifacts/api-server`)
- **Frontend**: React 19 + Vite + Tailwind CSS 4 (`artifacts/employee-master`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: JWT-based (bcryptjs for hashing)

## Structure

```text
├── artifacts/
│   ├── api-server/         # Express 5 REST API (PORT=3000)
│   └── employee-master/    # React + Vite frontend (PORT=5000)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Running the App

- **API server**: `PORT=3000 pnpm --filter @workspace/api-server run dev`
- **Frontend**: `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/employee-master run dev`
- Frontend proxies `/api` requests to `localhost:3000`

## Key Backend Details

- Routes in `artifacts/api-server/src/routes/`
- Activity logging middleware: `src/middlewares/activityLogger.ts`
  - Logs all write operations (POST/PUT/PATCH/DELETE) with module name, action, description, user, browser, device, IP
  - `ENTITY_MODULE_MAP` maps URL path segments to human-readable module names
- Default admin: `ashish.vaghela@lightfinance.com` / `admin@123`

## Database

- PostgreSQL via Replit managed DB (`DATABASE_URL` env var)
- Schema: `lib/db/src/schema/` (employees, systemUsers, modules, config, activityLogs, serviceDefinitions)
- Push schema: `pnpm --filter @workspace/db exec drizzle-kit push`

## Frontend Modules

- Employee Master (CRUD + import/export)
- Service Modules: VPN, Jira, MailVault, FTP, Acronis Backup, Tata Tele, Branch File Station, Assetcuez
- Dynamic Services (configurable via service definitions)
- Activity Logs (filterable, exportable to Excel)
- System Users
- Configuration
- Dashboard
