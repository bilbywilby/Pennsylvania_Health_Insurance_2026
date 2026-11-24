import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Trophy, Gavel, Database, Search, FlaskConical } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
export function Navbar() {
  const location = useLocation();
  const navItems = [
    { label: 'Audit Control', path: '/', icon: ShieldCheck },
    { label: 'Wall of Value', path: '/wall-of-value', icon: Trophy },
    { label: 'Audit Appeals', path: '/appeals', icon: Gavel },
    { label: 'CPT Consensus', path: '/map-cpt', icon: Database },
  ];
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight hidden sm:inline-block">EquiCare Audit</span>
            </Link>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="hidden md:flex gap-1 border-emerald-500/50 text-emerald-600 bg-emerald-50/50 cursor-help">
                    2026 Compliant ✓
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Meets PA Health Equity Act 2026 transparency standards.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 transition-colors hover:text-primary",
                  location.pathname === item.path ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link 
              to="/smoke" 
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 text-xs opacity-50 hover:opacity-100 transition-opacity",
                location.pathname === '/smoke' && "opacity-100 text-primary"
              )}
            >
              <FlaskConical className="h-3 w-3" />
              Smoke Test
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="relative top-0 right-0" />
            <Button variant="default" size="sm" className="hidden sm:flex shadow-md" asChild>
              <Link to="/search">
                <Search className="mr-2 h-4 w-4" />
                Price Search
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}