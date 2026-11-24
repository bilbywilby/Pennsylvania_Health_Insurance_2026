import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
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
import { AuditPage } from '@/pages/AuditPage'
import { TransparencyPage } from '@/pages/TransparencyPage'
import { WallOfValuePage } from '@/pages/WallOfValuePage'
import { AppealsTrackerPage } from '@/pages/AppealsTrackerPage'
const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/audit",
    element: <AuditPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/transparency",
    element: <TransparencyPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/wall",
    element: <WallOfValuePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/appeals",
    element: <AppealsTrackerPage />,
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