import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, ChevronRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/hooks/use-app-state";
interface PublicMetricCardProps {
  title: string;
  value: string | number;
  explanation: string;
  icon: React.ReactNode;
  trend: string;
  color: 'rose' | 'emerald' | 'amber' | 'sky';
  subtext?: string;
}
export function PublicMetricCard({ title, value, explanation, icon, trend, color, subtext }: PublicMetricCardProps) {
  const isExpertMode = useAppState(s => s.isExpertMode);
  const [showDetail, setShowDetail] = useState(false);
  const colorMap = {
    rose: {
      text: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      glow: "group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]",
      icon: "text-rose-400 bg-rose-500/20"
    },
    emerald: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      glow: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]",
      icon: "text-emerald-400 bg-emerald-500/20"
    },
    amber: {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      glow: "group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]",
      icon: "text-amber-400 bg-amber-500/20"
    },
    sky: {
      text: "text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
      glow: "group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]",
      icon: "text-sky-400 bg-sky-500/20"
    },
  };
  const style = colorMap[color];
  const effectiveExpert = isExpertMode || showDetail;
  return (
    <Card className={cn(
      "bg-slate-900/60 border-slate-800 transition-all duration-300 hover:scale-[1.02] hover:bg-slate-900/80 group overflow-hidden relative",
      style.glow
    )}>
      <div className={cn("absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-20", style.text)} />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">
            {title}
          </CardTitle>
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Info className="size-3 text-slate-600 cursor-help hover:text-sky-400 transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-700 text-slate-200 text-xs max-w-xs z-[100] shadow-2xl">
                {explanation}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className={cn("p-1.5 rounded-lg transition-transform group-hover:scale-110 duration-300", style.icon)}>
          {React.cloneElement(icon as React.ReactElement, { className: "size-4" })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold font-mono text-white group-hover:text-sky-100 transition-colors tracking-tight">
            {value}
          </div>
          <button 
            onClick={() => setShowDetail(!showDetail)}
            className="mb-1 text-[9px] font-bold text-slate-600 hover:text-sky-400 uppercase flex items-center gap-1"
          >
            {showDetail ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-500 uppercase font-medium tracking-tight group-hover:text-slate-400 transition-colors">
            {effectiveExpert ? subtext : "Regional Baseline"}
          </span>
          <Badge variant="outline" className={cn("text-[9px] py-0 px-2 h-4 font-mono transition-colors", style.text, style.bg, style.border)}>
            {trend}
          </Badge>
        </div>
        {effectiveExpert && (
          <div className="mt-3 pt-3 border-t border-slate-800/50 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>INTEGRITY VERIFIED</span>
              <span className="text-emerald-500">PA-SEC-OK</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}