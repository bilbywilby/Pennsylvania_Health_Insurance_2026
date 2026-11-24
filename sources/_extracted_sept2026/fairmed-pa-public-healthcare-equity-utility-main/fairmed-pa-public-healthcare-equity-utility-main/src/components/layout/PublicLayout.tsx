import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, BarChart3, Search, Scale, Landmark, History } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
export function PublicLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navItems = [
    { name: 'Audit', path: '/audit', icon: Scale },
    { name: 'Transparency', path: '/transparency', icon: BarChart3 },
    { name: 'Wall of Value', path: '/wall', icon: Landmark },
    { name: 'My Appeals', path: '/appeals', icon: History },
  ];
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <Landmark className="h-5 w-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight hidden sm:block">
              FairMed <span className="text-primary">PA</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden md:block">{item.name}</span>
              </Link>
            ))}
            <div className="ml-2 pl-2 border-l">
              <ThemeToggle className="static" />
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="h-5 w-5 text-primary" />
                <span className="font-display font-bold">FairMed PA</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                A public utility dedicated to healthcare pricing transparency for Pennsylvania residents.
                We use local benchmark data to detect upcoding and overcharging.
              </p>
            </div>
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <p className="text-xs text-destructive flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>DISCLAIMER:</strong> Not Legal or Medical Advice. FairMed PA is a simulation tool using estimated benchmarks.
                  Always consult with a professional regarding medical billing disputes.
                </span>
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} FairMed PA Public Utility. No PII is stored.
          </div>
        </div>
      </footer>
    </div>
  );
}