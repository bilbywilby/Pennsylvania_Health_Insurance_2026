import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Procedure } from '@shared/types';
import { Navbar } from '@/components/layout/Navbar';
import { ProcedureCard } from '@/components/procedure-card';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { data: procedures, isLoading, error } = useQuery({
    queryKey: ['procedures', query],
    queryFn: () => api<Procedure[]>(`/api/procedures?q=${encodeURIComponent(query)}`),
  });
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({ q: e.target.value });
  };
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-8">
          {/* Top Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={handleSearchChange}
                placeholder="Search procedures or codes..."
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters: Price Range, Provider Rating</span>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold">
              {query ? `Results for "${query}"` : 'Common Procedures'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {procedures?.length || 0} procedures found with available pricing data.
            </p>
          </div>
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="bg-destructive/10 p-4 rounded-full">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-xl font-bold">Error loading results</h3>
              <p className="text-muted-foreground">We couldn't retrieve pricing data right now. Please try again.</p>
            </div>
          ) : procedures && procedures.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {procedures.map((p) => (
                <ProcedureCard key={p.id} procedure={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 bg-secondary/20 rounded-3xl border border-dashed">
              <div className="bg-muted p-4 rounded-full">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold">No results found</h3>
              <p className="text-muted-foreground max-w-md">
                Try searching for specific codes like "72141" or procedure names like "MRI" or "Blood Test".
              </p>
            </div>
          )}
        </div>
      </main>
      {/* Quick Loading Overlay for smooth feel */}
      {isLoading && (
        <div className="fixed bottom-8 right-8 animate-bounce">
          <div className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}