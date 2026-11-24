import React from 'react';
import { cn } from '@/lib/utils';
interface ResilienceGaugeProps {
  score: number;
  label?: string;
  className?: string;
}
export function ResilienceGauge({ score, label = "Resilience Score", className }: ResilienceGaugeProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const getColorClasses = (s: number) => {
    if (s >= 75) return "text-emerald-500 stroke-emerald-500";
    if (s >= 45) return "text-amber-500 stroke-amber-500";
    return "text-red-500 stroke-red-500";
  };
  const getStatusText = (s: number) => {
    if (s >= 75) return "RESILIENT";
    if (s >= 45) return "MODERATE";
    return "CRITICAL";
  };
  const colorClasses = getColorClasses(score);
  const statusText = getStatusText(score);
  const isCritical = score < 45;
  return (
    <div className={cn("flex flex-col items-center justify-center p-4", className)}>
      <div className="relative h-32 w-32">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            className="text-slate-200 stroke-current"
            strokeWidth="8"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
          />
          <circle
            className={cn(
              "stroke-current transition-all duration-1000 ease-out", 
              colorClasses, 
              isCritical && "animate-pulse-subtle"
            )}
            strokeWidth="8"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={cn("text-2xl font-black leading-none", colorClasses.split(' ')[0])}>
            {score}
          </span>
          <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
            {statusText}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}