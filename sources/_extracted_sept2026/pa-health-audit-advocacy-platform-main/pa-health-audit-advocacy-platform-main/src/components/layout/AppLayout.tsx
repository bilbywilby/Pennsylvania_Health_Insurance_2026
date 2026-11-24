import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
type AppLayoutProps = {
  children: React.ReactNode;
  container?: boolean;
  className?: string;
  contentClassName?: string;
};
export function AppLayout({ children, container = false, className, contentClassName }: AppLayoutProps): JSX.Element {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className={className}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1" />
          <ThemeToggle className="relative top-0 right-0" />
        </header>
        {container ? (
          <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
            <main className={"flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12 w-full" + (contentClassName ? ` ${contentClassName}` : "")}>
              {children}
            </main>
            <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full border-t border-slate-200 mt-12">
              <div className="max-w-2xl mx-auto text-center space-y-2">
                <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                  PA Health Audit & Advocacy Platform
                </p>
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">
                  Institutional Disclaimer: PA Health Audit is a forensic data platform. Projections and calculations are non-evaluative and based on Q3 2025 regulatory filings. Results do not constitute clinical or legal advice. Verify all network data before finalizing health insurance decisions.
                </p>
              </div>
            </footer>
          </div>
        ) : (
          <main className="flex-1">{children}</main>
        )}
        <Toaster richColors position="top-right" />
      </SidebarInset>
    </SidebarProvider>
  );
}