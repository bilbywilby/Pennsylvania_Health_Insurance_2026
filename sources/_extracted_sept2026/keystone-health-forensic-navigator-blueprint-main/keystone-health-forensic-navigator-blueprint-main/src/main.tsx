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
import AuditConsole from '@/pages/AuditConsole'
import MarketIntelligence from '@/pages/MarketIntelligence'
import MedicalRightsWiki from '@/pages/MedicalRightsWiki'
const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/audit",
    element: <AuditConsole />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/market",
    element: <MarketIntelligence />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/wiki",
    element: <MedicalRightsWiki />,
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