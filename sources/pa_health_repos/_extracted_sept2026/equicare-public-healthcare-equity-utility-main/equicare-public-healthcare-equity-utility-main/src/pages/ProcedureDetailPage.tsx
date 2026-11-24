import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Procedure, Facility } from '@shared/types';
import { Navbar } from '@/components/layout/Navbar';
import { PriceVisualizer } from '@/components/PriceVisualizer';
import { FacilityList } from '@/components/FacilityList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Info, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';
export function ProcedureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: procedure, isLoading: isLoadingProc } = useQuery({
    queryKey: ['procedure', id],
    queryFn: () => api<Procedure>(`/api/procedures/${id}`),
    enabled: !!id,
  });
  const { data: facilities, isLoading: isLoadingFac } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => api<Facility[]>('/api/facilities'),
  });
  if (isLoadingProc) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-16 w-3/4 mb-4" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!procedure) return null;
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="space-y-12">
          {/* Header */}
          <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to search
            </Button>
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="space-y-2">
                <Badge variant="secondary" className="font-mono text-xs">CPT {procedure.cptCode}</Badge>
                <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight">
                  {procedure.name}
                </h1>
                <p className="text-muted-foreground text-lg max-w-3xl">
                  {procedure.description}
                </p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 w-full md:w-auto min-w-[280px]">
                <span className="text-sm font-semibold text-primary/70 block mb-1">EquiCare Fair Price</span>
                <div className="text-5xl font-display font-black text-primary mb-2">
                  ${procedure.fairPrice.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground leading-tight">
                  Based on Medicare rate + local market adjustment.
                </p>
              </div>
            </div>
          </div>
          {/* Visualization Section */}
          <section className="bg-secondary/20 rounded-3xl border p-8 md:p-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Cost Analysis
                </h2>
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    Medical providers often charge significantly more than the cost of care. Our Fair Price represents a standard benchmark that ensures providers are fairly compensated while protecting you from predatory billing.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-background p-4 rounded-xl border">
                      <span className="text-2xl font-bold text-foreground">Save ${ (procedure.avgPrice - procedure.fairPrice).toLocaleString() }</span>
                      <p className="text-xs">vs. market average</p>
                    </div>
                    <div className="bg-background p-4 rounded-xl border">
                      <span className="text-2xl font-bold text-foreground">Range</span>
                      <p className="text-xs">${procedure.marketRange[0]} - ${procedure.marketRange[1]}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-background rounded-2xl p-6 shadow-sm border">
                <PriceVisualizer 
                  fairPrice={procedure.fairPrice} 
                  avgPrice={procedure.avgPrice} 
                  marketRange={procedure.marketRange} 
                />
              </div>
            </div>
          </section>
          {/* Facility List */}
          <section className="space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h2 className="text-2xl font-display font-bold">Local Provider Comparison</h2>
                <p className="text-sm text-muted-foreground">Top-rated facilities for this procedure in your area.</p>
              </div>
              <Button variant="link" className="text-primary font-bold">Map View</Button>
            </div>
            {isLoadingFac ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
              </div>
            ) : (
              <FacilityList facilities={facilities || []} fairPrice={procedure.fairPrice} />
            )}
          </section>
          {/* Negotiation Tips */}
          <section className="bg-primary text-primary-foreground rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-12">
              <div className="md:w-1/3">
                <h2 className="text-3xl font-display font-black mb-4">Patient Advocacy Toolkit</h2>
                <p className="opacity-80 text-sm mb-6 leading-relaxed">
                  Don't settle for a surprise bill. Use these proven strategies to lower your out-of-pocket costs before or after treatment.
                </p>
                <Button variant="secondary" className="w-full font-bold group" asChild>
                  <Link to="/advocacy">
                    Get Toolkit
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="flex-1 grid gap-4">
                {[
                  "Request a Good Faith Estimate (GFE) at least 3 days before your procedure.",
                  "Verify that both the facility AND the specific physician are in-network.",
                  "Mention the Medicare benchmark rate if negotiating a bill after service.",
                  "Ask for 'cash pay' discounts, which are often 30-50% lower than insurance rates."
                ].map((tip, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-xl flex gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
function ArrowRight(props: any) {
  return <ChevronLeft className="rotate-180" {...props} />
}