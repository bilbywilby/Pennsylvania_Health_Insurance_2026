import React from 'react';
import { TrendingUp, AlertCircle, Zap } from 'lucide-react';
interface ForecastAlertProps {
  amount: number;
  multiplier: number;
  carrierName?: string;
}
export function ForecastAlert({ amount, multiplier, carrierName }: ForecastAlertProps) {
  const isCustomCarrier = carrierName && carrierName !== "" && carrierName !== "none";
  const percentageShift = (multiplier * 100 - 100).toFixed(1);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <TrendingUp className="h-24 w-24 text-blue-400" />
      </div>
      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600/20 p-2 rounded-lg">
            <Zap className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">
              2026 Cost Rehydration
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Forensic Projection based on {isCustomCarrier ? carrierName : "Area Average"} Volatility
            </p>
          </div>
        </div>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-3xl font-black text-white tracking-tighter">
              ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-bold text-blue-400 uppercase">Projected 2026 Allowed Amount</p>
          </div>
          <div className="h-10 w-px bg-slate-800" />
          <div>
            <p className="text-xl font-black text-amber-400">+{percentageShift}%</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Applied Multiplier</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 text-[10px] text-slate-500 italic font-medium">
          <AlertCircle className="h-3 w-3" />
          <span>Note: Projection reflects raw medical cost trend before network-specific arbitration.</span>
        </div>
      </div>
    </div>
  );
}