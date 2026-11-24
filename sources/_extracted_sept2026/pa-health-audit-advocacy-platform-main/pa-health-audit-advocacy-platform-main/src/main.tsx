import '@/lib/errorReporter';
import React, { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { PageLoader } from "@/components/PageLoader";
import { AuditProvider } from "@/context/AuditContext";
import '@/index.css';
import { enableMapSet } from "immer";
enableMapSet();
const HomePage = lazy(() => import('@/pages/HomePage'));
const RatingAreaPage = lazy(() => import('@/pages/RatingAreaPage'));
const AuditToolPage = lazy(() => import('@/pages/tools/AuditToolPage'));
const SubsidyPage = lazy(() => import('@/pages/tools/SubsidyPage'));
const AppealPage = lazy(() => import('@/pages/tools/AppealPage'));
const GuidePage = lazy(() => import('@/pages/GuidePage'));
const ReportGeneratorView = lazy(() => import('@/components/reports/ReportGeneratorView'));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
const router = createBrowserRouter([
  { path: "/", element: <HomePage />, errorElement: <RouteErrorBoundary /> },
  { path: "/area/:id", element: <RatingAreaPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/tools/audit", element: <AuditToolPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/tools/subsidy", element: <SubsidyPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/tools/appeal", element: <AppealPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/tools/parser", element: <ReportGeneratorView />, errorElement: <RouteErrorBoundary /> },
  { path: "/guide", element: <GuidePage />, errorElement: <RouteErrorBoundary /> },
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuditProvider>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <RouterProvider router={router} />
          </Suspense>
        </ErrorBoundary>
      </AuditProvider>
    </QueryClientProvider>
  </StrictMode>,
);