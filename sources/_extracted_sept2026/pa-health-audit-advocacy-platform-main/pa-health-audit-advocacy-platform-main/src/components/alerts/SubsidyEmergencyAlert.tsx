import React from 'react';
import { AlertOctagon, TrendingUp, Info } from 'lucide-react';
export function SubsidyEmergencyAlert() {
  return (
    <div className="bg-red-600 text-white rounded-2xl p-6 shadow-xl border-4 border-red-500 animate-pulse-subtle">
      <div className="flex items-start gap-4">
        <div className="bg-white/20 p-2 rounded-lg">
          <AlertOctagon className="h-8 w-8 text-white" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black tracking-tight uppercase leading-none">
            CRITICAL: 2026 ARPA EXPIRY DETECTED
          </h3>
          <p className="text-sm font-medium opacity-90 leading-relaxed">
            Forensic projections confirm the expiration of ARPA premium caps. Households exceeding 400% FPL 
            threshold will experience a minimum <span className="underline font-black">102% net premium jump</span>.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-xs font-bold">
              <TrendingUp className="h-3 w-3" /> VOLATILITY: EXTREME
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-xs font-bold">
              <Info className="h-3 w-3" /> FPL CLIFF: ACTIVE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}