import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VolatilityAudit } from "@/components/VolatilityAudit";
import { PDFExport } from "@/components/PDFExport";
import { ForensicBrief } from "@/components/ForensicBrief";
import { TLDR_STATS } from "@/lib/briefContent";
import {
  ArrowRight, Zap, MapPin, ShieldCheck, Activity, AlertCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { RATING_AREAS } from "@/data/ratingAreas";
export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const briefRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);
  return (
    <AppLayout container>
      <div className="space-y-12">
        {/* Hero Section with Forensic Brief */}
        <section className="animate-fade-in" ref={briefRef}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">
            <div className="lg:col-span-8 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                <Zap className="h-3 w-3" />
                CRITICAL: 2026 FORENSIC BRIEF
              </div>
              <ForensicBrief />
              <div className="pt-4">
                <PDFExport contentRef={briefRef} documentTitle="PA-2026-Market-Brief" label="Export Briefing Report" />
              </div>
            </div>
            <aside className="lg:col-span-4 space-y-6">
              <Card className="border-2 border-slate-900 shadow-xl bg-slate-900 text-white overflow-hidden break-inside-avoid">
                <CardHeader className="bg-slate-800 border-b border-slate-700">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-400" />
                    TLDR Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-800">
                    <div className="p-4 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Statewide Baseline</p>
                      <p className="text-2xl font-black text-red-400">{TLDR_STATS.statewideIncrease}</p>
                    </div>
                    <div className="p-4 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Outlier Alert</p>
                      <p className="text-lg font-black text-amber-400">{TLDR_STATS.volatilityPeak}</p>
                    </div>
                    <div className="p-4 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Efficiency Shift</p>
                      <p className="text-lg font-black text-emerald-400">{TLDR_STATS.efficiencyLeader}</p>
                    </div>
                    <div className="p-4 space-y-1 bg-blue-900/20">
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Cliff Impact</p>
                      <p className="text-lg font-black text-white">{TLDR_STATS.fplCliffImpact}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-dashed border-2 break-inside-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    Live Audit Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Market Logic Validated
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </section>
        {/* Chart Section */}
        <section className="pt-12 border-t">
          <VolatilityAudit />
        </section>
        {/* Map Section */}
        <section className="space-y-6 pt-12 border-t">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              Interactive Market Explorer
            </h2>
          </div>
          <div className="relative aspect-video w-full max-w-4xl mx-auto bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-[300px]">
             <div className="grid grid-cols-3 gap-2 w-full h-full opacity-60">
                {RATING_AREAS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/area/${a.id}`)}
                    className="bg-blue-200 hover:bg-blue-600 hover:text-white cursor-pointer transition-all flex items-center justify-center rounded-lg font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label={`Explore Rating Area ${a.id}`}
                  >
                    Area {a.id}
                  </button>
                ))}
             </div>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-slate-500 font-black uppercase tracking-widest text-sm bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-lg border border-slate-200">
                  Click an Area to Explore Forensic Data
                </p>
             </div>
          </div>
        </section>
        {/* Regional Cards */}
        <section className="space-y-6 pt-12 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
              : RATING_AREAS.map((area) => (
              <Card key={area.id} className="group hover:border-blue-500 transition-all cursor-pointer border-2 border-transparent">
                <CardHeader className="pb-2">
                  <Badge variant="outline" className="w-fit text-[10px] uppercase font-bold text-blue-600 border-blue-200">Area {area.id}</Badge>
                  <CardTitle className="text-lg">{area.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground italic">Risk Score: {area.volatilityScore}/10</p>
                  <Button asChild variant="outline" className="w-full font-bold">
                    <Link to={`/area/${area.id}`}>Strategic Intel <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}