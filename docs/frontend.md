# Frontend Documentation

## Overview
The frontend is a single-page application built with Vite, React, and TypeScript. It uses shadcn/ui and Tailwind CSS for the design system, TanStack Query for data fetching and caching, and integrates with Supabase real-time channels and the FastAPI backend.

## Framework & Tooling
- React 18.3 with functional components and hooks
- TypeScript with the `@/*` path alias defined in `tsconfig.json`
- Vite 5 with the `@vitejs/plugin-react-swc` plugin and custom chunk splitting

## Project Structure
```
src/
├── App.tsx / main.tsx          # Application entry points
├── pages/                      # Route components (Dashboard, Contracts, Maintenances, Clients, Admin, Upload, etc.)
├── components/                 # Shared and domain-specific UI (chat, uploads, metrics, forms)
├── hooks/                      # Reusable hooks for AI, realtime sync, uploads, optimized queries
├── contexts/                   # Auth provider and QueryClient provider
├── services/                   # REST wrapper (`backendApi`, compatibility helpers)
├── integrations/supabase/      # Supabase client and generated types
├── utils/ / lib/               # Helper functions (formatters, caching)
└── test/                       # Testing Library wrapper and utilities
```

## Routing
- `react-router-dom` with `BrowserRouter` configured in `App.tsx`
- Key routes:
  - `/` → Dashboard
  - `/app/contracts`, `/app/maintenances`, `/app/clients`
  - `/app/ai-agents`, `/app/reports`, `/app/calendar`
  - `/auth` for sign-in/sign-up
  - `/admin/*` (AdminDashboard, AdminLogs, AdminUsers)
  - Fallback: `NotFound.tsx`

## State & Data Management
- `@tanstack/react-query` handles server state, retries, and caching (see `contexts/OptimizedQueryProvider.tsx`)
- Domain hooks encapsulate logic:
  - `useOptimizedRealtimeSync`, `useRealtimeSync`, `useMaintenanceStatusSync`
  - `useContractExtraction`, `useContractExtractionViaStorage`, `useDocumentIntelligence`
  - `useErrorRecovery`, `useRateLimit`, `useMemoryCleanup`
- Contexts:
  - `AuthContext` manages authentication state and token persistence
  - `QueryOptimizationProvider` wraps the application with a configured QueryClient

## Components
- Base UI: shadcn components under `components/ui/*`
- Contract flows: `ContractEditFormExpanded`, `ContractDetailsView`, `ContractUpload`, `ContractDocumentsWithAgents`
- Maintenance: `ContractMaintenancesList`, `QuickStatusChanger`
- AI surfaces: `AIInsights`, `SmartAlerts`, `IntelligentMetrics`, `IntegratedUploadWithAgentsEnhanced`
- Chat: `ContractChat`
- Admin: `Admin*` components inside `src/pages/admin`
- Loading and error handling: `components/LoadingStates.tsx`, `ContractLoadingFallback`, `ContractErrorBoundary`

## Styling
- Tailwind CSS with custom tokens (colors, typography, spacing) defined in `tailwind.config.ts`
- Global styles and CSS variables in `App.css` and `index.css`
- Utility classes such as `border-card-border` and `text-metric-medium` keep visuals consistent
- `next-themes` is available for theming hooks if needed

## API Integration
- `services/api.ts` centralizes REST calls to the FastAPI backend (`contractsApi`, `maintenancesApi`, `dashboardApi`, `authApi`)
- `backendApi` retains backward-compatible helpers for legacy flows (admin endpoints)
- `supabase` client is exported with default keys — must be hardened before production
- `API_BASE_URL` comes from `config/api.config.ts`, enforcing `VITE_API_URL`
- `handleApiError` standardizes error parsing for network, timeout, and server errors

## Realtime & Storage
- `useRealtimeSync` and `useOptimizedRealtimeSync` subscribe to Supabase realtime channels per table (`contracts`, `maintenances`, `clients`) and invalidate React Query caches accordingly
- Upload flows and error logging interact with Supabase Storage via `supabase.storage.from(...)`

## Testing
- `src/pages/Dashboard.test.tsx` (outdated and needs alignment with the current dashboard)
- `hooks/useAuth.test.tsx` covers the authentication context
- `src/test/test-utils.tsx` wraps components with Router, AuthProvider, and QueryClient for tests
- Scripts: `npm run test`, `npm run test:ui`, `npm run test:run`

## Build & Performance
- Manual chunking in `vite.config.ts` separates large vendor bundles (React, shadcn, React Query, Supabase)
- Terser removes `console` and `debugger` statements in production builds
- `chunkSizeWarningLimit` is set to 1000 KB; monitor bundle size over time
- CSS code splitting is enabled; assets inline limit defaults to 4 KB
- Hooks like `useDebounce` and `useOptimizedQuery` help avoid excessive re-renders

## Observations & TODOs
- Update Vitest specs (and add component stories) to reflect the current UI.
- Remove unused dependencies (`moment`) if `date-fns` fully replaces them.
- Harden `AuthContext` by adopting HTTP-only cookies or refresh tokens.
- Break down large components such as `Contracts.tsx` into smaller, testable pieces.
- Document error flows and SSE progress indicators for the upload experience.
