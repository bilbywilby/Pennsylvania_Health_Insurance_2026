import React from 'react';
import { cn } from '@/lib/utils';
interface FairnessGaugeProps {
  score: number;
}
export function FairnessGauge({ score }: FairnessGaugeProps): JSX.Element {
  const getColor = (): string => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 50) return 'text-orange-500 stroke-orange-500';
    return 'text-rose-500 stroke-rose-500';
  };
  const getStatus = (): string => {
    if (score >= 80) return 'Fair Price';
    if (score >= 50) return 'High Billing';
    return 'Price Gouging';
  };
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r="40"
          strokeWidth="8"
          fill="transparent"
          stroke="hsl(var(--muted)/0.2)"
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r="40"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-1000 ease-out origin-center', getColor())}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn('text-3xl font-bold font-display', getColor())}>
          {Math.round(score)}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Score
        </div>
      </div>
      {/* Status badge */}
      <div className="mt-4 px-3 py-1 rounded-full bg-muted font-bold text-sm">
        <span className={cn(getColor())}>{getStatus()}</span>
      </div>
    </div>
  );
}