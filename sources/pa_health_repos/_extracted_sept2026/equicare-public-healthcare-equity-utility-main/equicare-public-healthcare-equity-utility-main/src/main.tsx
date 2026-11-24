import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { SearchPage } from '@/pages/SearchPage'
import { ProcedureDetailPage } from '@/pages/ProcedureDetailPage'
import { WallOfValuePage } from '@/pages/WallOfValuePage'
import { AppealsPage } from '@/pages/AppealsPage'
import { CptMappingPage } from '@/pages/CptMappingPage'
import { SmokeTestPage } from '@/pages/SmokeTestPage'
const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/search",
    element: <SearchPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/procedure/:id",
    element: <ProcedureDetailPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/wall-of-value",
    element: <WallOfValuePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/appeals",
    element: <AppealsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/map-cpt",
    element: <CptMappingPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/smoke",
    element: <SmokeTestPage />,
    errorElement: <RouteErrorBoundary />,
  },
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)