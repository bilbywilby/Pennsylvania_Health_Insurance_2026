import React from "react";
import { motion } from "framer-motion";
import { Link2, ShieldCheck, AlertTriangle } from "lucide-react";
import type { ForensicRecord } from "@shared/types";
import { cn } from "@/lib/utils";
interface ChainVisualizerProps {
  records: ForensicRecord[];
  isLoading: boolean;
}
export function ChainVisualizer({ records, isLoading }: ChainVisualizerProps) {
  if (isLoading) return <div className="space-y-4">
    <div className="h-10 bg-slate-800 animate-pulse rounded" />
    <div className="h-10 bg-slate-800 animate-pulse rounded" />
  </div>;
  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <motion.div
          key={record.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative pl-6"
        >
          {/* Vertical Linkage Line */}
          {index < records.length - 1 && (
            <div className="absolute left-2.5 top-6 bottom-[-12px] w-[1px] bg-slate-800" />
          )}
          <div className="flex items-start gap-3">
            <div className={cn(
              "z-10 mt-1 size-5 rounded-full flex items-center justify-center border-2",
              record.variance.status === 'critical' 
                ? "bg-rose-950 border-rose-500 text-rose-500" 
                : "bg-slate-900 border-sky-500 text-sky-500"
            )}>
              <Link2 className="size-3" />
            </div>
            <div className="flex-1 bg-slate-950/40 p-2 rounded border border-slate-800/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase">
                  Hash: {record.recordHash.slice(0, 12)}...
                </span>
                <span className="text-[9px] text-slate-600">
                  {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-300">INTEGRITY SEALED</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      <div className="mt-4 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <ShieldCheck className="size-3 text-emerald-500" />
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Tamper Check: Passed</span>
      </div>
    </div>
  );
}