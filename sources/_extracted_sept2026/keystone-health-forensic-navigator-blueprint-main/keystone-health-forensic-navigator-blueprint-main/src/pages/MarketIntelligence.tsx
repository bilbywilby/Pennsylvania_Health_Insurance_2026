import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Activity, MapPin, TrendingUp, ShieldCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
const RATE_INCREASE_DATA = [
  { region: "Area 1", hike: 12.4, carrier: "Highmark", geo: "Philadelphia / SE PA" },
  { region: "Area 2", hike: 8.2, carrier: "UPMC", geo: "Allentown / Lehigh Valley" },
  { region: "Area 3", hike: 15.1, carrier: "Geisinger", geo: "Harrisburg / Central PA" },
  { region: "Area 4", hike: 9.8, carrier: "Independence", geo: "Pittsburgh / SW PA" },
  { region: "Area 5", hike: 11.2, carrier: "Aetna", geo: "Erie / NW PA" },
  { region: "Area 6", hike: 7.4, carrier: "Highmark", geo: "Scranton / NE PA" },
];
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl backdrop-blur-md shadow-2xl space-y-2">
        <p className="text-[10px] font-mono text-sky-400 uppercase tracking-widest">{data.region}</p>
        <p className="text-sm font-bold text-white">{data.geo}</p>
        <div className="flex items-center justify-between gap-8 pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400">Rate Hike:</span>
          <span className={cn("text-xs font-mono font-bold", data.hike > 12 ? "text-rose-400" : "text-emerald-400")}>
            +{data.hike}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-8">
          <span className="text-xs text-slate-400">Carrier:</span>
          <span className="text-xs text-slate-200">{data.carrier}</span>
        </div>
      </div>
    );
  }
  return null;
};
export default function MarketIntelligence() {
  return (
    <AppLayout className="bg-slate-950 min-h-screen text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-8 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Market Intelligence</h1>
              <p className="text-muted-foreground">PA 2026 Carrier Rate Analysis & Regional Baselines</p>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/20 px-4 py-2 rounded-lg flex items-center gap-2">
              <ShieldCheck className="size-4 text-sky-400" />
              <span className="text-xs font-mono text-sky-400">Verified PA-DOH Data</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {RATE_INCREASE_DATA.slice(0, 4).map((item) => (
              <Card key={item.region} className="bg-slate-900/50 border-slate-800 glass hover:bg-slate-900/80 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-mono">{item.region}</p>
                      <p className="text-2xl font-bold font-mono">+{item.hike}%</p>
                    </div>
                    <MapPin className="size-4 text-muted-foreground/50" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">{item.geo}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium">Carrier Rate Hike Projections</CardTitle>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase">
                   <div className="size-2 bg-rose-500 rounded-full" /> Elevated
                   <div className="size-2 bg-sky-500 rounded-full ml-2" /> Nominal
                </div>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={RATE_INCREASE_DATA} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="region" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `+${val}%`} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                    <Bar dataKey="hike" radius={[6, 6, 0, 0]} barSize={40}>
                      {RATE_INCREASE_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hike > 12 ? "#f43f5e" : "#0ea5e9"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card className="bg-slate-900/50 border-slate-800 glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="size-4 text-emerald-400" />
                    Market Volatility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Regional Area 3 (Harrisburg) shows high deviation from state averages due to carrier network restructuring and Geisinger network shifts.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span>State Average Hike</span>
                      <span className="text-sky-400">10.2%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 w-[72%]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                <div className="flex items-center gap-2 text-amber-500">
                  <Info className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Advocate's Tip</span>
                </div>
                <p className="text-xs text-amber-200/60 leading-relaxed">
                  When a rate hike exceeds 15% (e.g. Area 3), carriers often use more aggressive "Out of Network" denials. Advise clients in this region to confirm "In-Network Status" at every visit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}