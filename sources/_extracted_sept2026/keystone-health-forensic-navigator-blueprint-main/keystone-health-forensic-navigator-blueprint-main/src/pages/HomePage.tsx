import React, { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { DashboardStats } from "@shared/types";
import { ChainVisualizer } from "@/components/dashboard/ChainVisualizer";
import { RecordDrilldown } from "@/components/dashboard/RecordDrilldown";
import { PublicMetricCard } from "@/components/dashboard/PublicMetricCard";
import { useAppState } from "@/hooks/use-app-state";
import { getPrediction, COUNTY_DATA } from "@/lib/forensic-core";
import { GlossarySheet } from "@/components/shared/GlossarySheet";
import { toast } from "sonner";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Activity,
  History,
  ShieldAlert,
  Fingerprint,
  Zap,
  HelpCircle,
  MapPin,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";
export function HomePage() {
  const isExpertMode = useAppState(s => s.isExpertMode);
  const activeCounty = useAppState(s => s.activeCounty);
  const countyInfo = COUNTY_DATA[activeCounty] || COUNTY_DATA["Allegheny"];
  const { data: stats, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', activeCounty],
    queryFn: () => api<DashboardStats>(`/api/audit-stats?county=${activeCounty}`),
    refetchInterval: 15000,
  });
  const predictionText = useMemo(() => getPrediction(stats?.marketVolatilityIndex ?? 0), [stats]);
  const handleStartTour = () => {
    toast.info("Initializing Guided Tour", {
      description: "Preparing a walkthrough of the forensic auditing interface.",
      duration: 3000
    });
  };
  if (isError) {
    return (
      <AppLayout className="bg-slate-950 min-h-screen text-slate-100">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <ShieldAlert className="size-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold">Secure Node Unavailable</h2>
            <p className="text-slate-400">Unable to establish a secure link with PA market nodes.</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout className="bg-slate-950 min-h-screen text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-8 animate-fade-in">
          {/* Dashboard Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-800 p-8 shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles className="size-64 text-sky-400" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30">
                    {isExpertMode ? "AUDIT TERMINAL" : "MY HEALTH ADVOCATE"}
                  </Badge>
                  <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                    <MapPin className="size-3 text-sky-500" /> {activeCounty} County ({countyInfo.ratingArea})
                  </span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white">
                  {isExpertMode ? "Forensic Market Dashboard" : "Is My Medical Bill Honest?"}
                </h1>
                <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                  {isExpertMode
                    ? "Cryptographic synthesis of regional carrier filings and CPT billing volatility index."
                    : "We check if you're being overcharged for healthcare in Pennsylvania using actual state price records."
                  }
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button onClick={handleStartTour} className="btn-gradient rounded-xl font-bold px-6">
                    <Sparkles className="size-4 mr-2" /> Start Guided Tour
                  </Button>
                  <GlossarySheet>
                    <Button variant="outline" className="rounded-xl border-slate-700 hover:bg-slate-800">
                      <HelpCircle className="size-4 mr-2" /> Help Me Understand
                    </Button>
                  </GlossarySheet>
                </div>
              </div>
              <Card className="w-full md:w-80 bg-slate-950/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 space-y-4 shadow-2xl">
                <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                  <Activity className="size-4" /> Future Outlook
                </h3>
                <div className="p-3 bg-sky-500/5 rounded-xl border border-sky-500/10">
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {predictionText}
                  </p>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-500 uppercase font-bold">Stability Score</span>
                    <span className="text-emerald-400 font-bold">{countyInfo.stability}%</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${countyInfo.stability}%` }} />
                  </div>
                </div>
              </Card>
            </div>
          </section>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <PublicMetricCard
              title={isExpertMode ? "Total Variance" : "Price Gap Found"}
              value={isLoading ? "..." : `${((stats?.totalVarianceCents ?? 0) / 100).toLocaleString()}`}
              explanation="Total difference between billed amounts and Fair Market Value across this region."
              icon={<TrendingUp />}
              trend={isExpertMode ? "Elevated" : "Too High"}
              color="rose"
              subtext={isExpertMode ? "Aggregate Delta" : "Extra Fees Spotted"}
            />
            <PublicMetricCard
              title={isExpertMode ? "Sealed Audits" : "Verified Records"}
              value={isLoading ? "..." : stats?.sealedAuditCount ?? 0}
              explanation="Number of records cryptographically locked into the immutable forensic ledger."
              icon={<CheckCircle2 />}
              trend="Secure"
              color="emerald"
              subtext={isExpertMode ? "LMP-256 Count" : "Locked History"}
            />
            <PublicMetricCard
              title={isExpertMode ? "Volatility Index" : "Price Swings"}
              value={isLoading ? "..." : `${stats?.marketVolatilityIndex}%`}
              explanation="Measures regional price deviation from the 2026 CMS fair baseline."
              icon={<ShieldAlert />}
              trend={stats?.volatilityClass ?? "NOMINAL"}
              color="amber"
              subtext={isExpertMode ? "Deviation Metric" : "Market Unrest"}
            />
            <PublicMetricCard
              title={isExpertMode ? "Risk Probability" : "Anomaly Score"}
              value={isLoading ? "..." : stats?.riskScore ?? 0}
              explanation="Mathematical probability of billing errors or upcoding patterns in current audits."
              icon={<Fingerprint />}
              trend="Active"
              color="sky"
              subtext={isExpertMode ? "Predictive Index" : "Error Likelihood"}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-medium">{activeCounty} Fair Price Trends</CardTitle>
                  <p className="text-xs text-slate-500">Comparing {countyInfo.primaryCarrier} against state benchmarks</p>
                </div>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.multiCarrierTrends ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="timestamp" stroke="#475569" fontSize={11} />
                    <YAxis stroke="#475569" fontSize={11} tickFormatter={(v) => `$${v/100}`} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="highmark" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} name="Highmark" />
                    <Line type="monotone" dataKey="upmc" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="UPMC" />
                    <Line type="monotone" dataKey="marketAvg" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" name="2026 Baseline" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Trust Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChainVisualizer records={stats?.recentRecords ?? []} isLoading={isLoading} />
                </CardContent>
              </Card>
              <div className="p-6 rounded-3xl bg-sky-500/5 border border-sky-500/10 space-y-3">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="size-4" /> Market Alert
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In <strong>{activeCounty} County</strong>, {countyInfo.primaryCarrier} bills for office visits are currently <strong>8% higher</strong> than state averages.
                </p>
                <button className="text-[10px] font-bold text-sky-400 hover:underline">LEARN HOW TO APPEAL</button>
              </div>
            </div>
          </div>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-5 text-slate-400" />
                <h2 className="text-xl font-bold text-white">Recent Analysis Logs</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-500 text-xs">VIEW ALL HISTORY <ArrowRight className="ml-2 size-3" /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full bg-slate-800 rounded-3xl" />)
              ) : (
                stats?.recentRecords?.map((record) => <RecordDrilldown key={record.id} record={record} />)
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}