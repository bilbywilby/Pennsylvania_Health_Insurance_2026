import React from "react";
import { motion } from "framer-motion";
import { 
  Zap, 
  Lightbulb, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { useAppState } from "@/hooks/use-app-state";
import { generateSmartNarrative } from "@/lib/forensic-core";
import { cn } from "@/lib/utils";
interface SmartNarrativeProps {
  record: any;
  className?: string;
}
export function SmartNarrative({ record, className }: SmartNarrativeProps) {
  const isExpertMode = useAppState(s => s.isExpertMode);
  const narrative = generateSmartNarrative(record, isExpertMode);
  const isHighRisk = record.variance.status === 'critical';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border p-5 space-y-4",
        isHighRisk 
          ? "bg-rose-500/5 border-rose-500/20" 
          : "bg-emerald-500/5 border-emerald-500/20",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg mt-0.5",
          isHighRisk ? "bg-rose-500/20 text-rose-500" : "bg-emerald-500/20 text-emerald-500"
        )}>
          {isHighRisk ? <AlertCircle className="size-4" /> : <ShieldCheck className="size-4" />}
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {isExpertMode ? "Forensic Insight" : "My Health Advice"}
          </h4>
          <p className="text-sm text-slate-100 leading-relaxed font-medium">
            {narrative.text}
          </p>
        </div>
      </div>
      <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/50">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="size-3 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">What should I do?</span>
        </div>
        <p className="text-xs text-slate-300 mb-3">
          {narrative.action}
        </p>
        <button className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors">
          SEE FULL STEPS <ArrowRight className="size-3" />
        </button>
      </div>
      {!isExpertMode && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
          <CheckCircle2 className="size-3 text-emerald-500" />
          <span className="text-[9px] text-slate-500">Verified against Area 4 market baselines</span>
        </div>
      )}
    </motion.div>
  );
}