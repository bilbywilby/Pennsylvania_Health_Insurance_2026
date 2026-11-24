import React, { useRef } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PDFExport } from "@/components/PDFExport";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { RATING_AREAS } from "@/data/ratingAreas";
import { ShieldCheck, AlertTriangle, TrendingUp, Zap, Info, ArrowRight } from "lucide-react";
import { TLDR_STATS } from "@/lib/briefContent";
export default function GuidePage() {
  const printRef = useRef<HTMLDivElement>(null);
  const chartData = [...RATING_AREAS]
    .map(area => ({
      name: `Area ${area.id}`,
      avg: area.carriers.reduce((acc, c) => acc + c.approvedIncrease, 0) / area.carriers.length,
      volatility: area.volatilityScore
    }))
    .sort((a, b) => b.avg - a.avg);
  return (
    <AppLayout container>
      <div className="space-y-8 animate-fade-in" ref={printRef}>
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight">2026 Market Summary Guide</h1>
            <p className="text-muted-foreground max-w-2xl">
              Consolidated forensic intelligence for the Pennsylvania health insurance marketplace.
              Designed for rapid institutional assessment and risk mitigation.
            </p>
          </div>
          <PDFExport contentRef={printRef} documentTitle="PA-2026-Market-Guide" label="Export Summary Guide" />
        </header>
        {/* Risk Heatmap Legend */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Stable", color: "bg-emerald-500", range: "1-3", desc: "Minimal carrier churn" },
            { label: "Moderate", color: "bg-blue-500", range: "4-6", desc: "Standard market shifts" },
            { label: "High Risk", color: "bg-amber-500", range: "7-8", desc: "Network narrowing" },
            { label: "Extreme", color: "bg-red-500", range: "9-10", desc: "30%+ Outlier spikes" },
          ].map((item) => (
            <Card key={item.label} className="border-none shadow-sm bg-slate-50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-2 rounded-full ${item.color}`} />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{item.desc} (Score: {item.range})</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
        {/* Key Findings Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase">Statewide Baseline</CardDescription>
              <CardTitle className="text-2xl font-black text-red-600">{TLDR_STATS.statewideIncrease}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Weighted average increase across all 9 rating areas for 2026.</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase">Volatility Outlier</CardDescription>
              <CardTitle className="text-2xl font-black text-amber-600">37.8% Spike</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Detected in Ambetter Silver tier benchmarks (Philly/Lehigh).</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase">Efficiency Leader</CardDescription>
              <CardTitle className="text-2xl font-black text-emerald-600">10.1% Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Jefferson Health Plans demonstrating superior cost containment.</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase">Subsidy Cliff</CardDescription>
              <CardTitle className="text-2xl font-black text-blue-600">102% Jump</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Projected net premium impact for households at 401% FPL.</p>
            </CardContent>
          </Card>
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Market Summary Chart */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Regional Volatility Benchmark
              </CardTitle>
              <CardDescription>Average approved carrier rate increases by Rating Area.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(v: number) => [`${v.toFixed(1)}%`, 'Avg. Increase']}
                    />
                    <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.volatility >= 8 ? '#ef4444' : entry.volatility >= 6 ? '#f59e0b' : '#3b82f6'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          {/* Strategic Conclusion */}
          <Card className="lg:col-span-4 bg-slate-900 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                Strategic Protocols
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Zap className="h-5 w-5 text-amber-400 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold uppercase">Silver Loading Audit</p>
                    <p className="text-[10px] text-slate-400">Highmark and Ambetter Silver plans require forensic rehydration to verify CSR eligibility.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold uppercase">Cliff Mitigation</p>
                    <p className="text-[10px] text-slate-400">Households near $60,240 (Individual) must audit income to prevent ARPA subsidy loss.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-400 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold uppercase">Network Integrity</p>
                    <p className="text-[10px] text-slate-400">UPMC vs Highmark facility access is narrowing; cross-county verification is mandatory.</p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                  Final Conclusion: 2026 represents the most volatile marketplace since 2018. 
                  Forensic data utilization is required for all high-value plan selections.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}