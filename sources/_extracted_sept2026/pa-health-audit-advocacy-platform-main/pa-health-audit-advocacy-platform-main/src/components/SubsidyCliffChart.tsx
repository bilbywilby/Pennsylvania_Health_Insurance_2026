import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
interface SubsidyCliffChartProps {
  benchmarkPremium: number;
  householdSize: number;
}
export const SubsidyCliffChart = React.memo(({ benchmarkPremium, householdSize }: SubsidyCliffChartProps) => {
  const chartId = useMemo(() => `chart-${Math.random().toString(36).substr(2, 9)}`, []);
  const data = useMemo(() => {
    const points = [];
    for (let fpl = 100; fpl <= 600; fpl += 10) {
      let contributionRate = 0;
      if (fpl <= 150) contributionRate = 0;
      else if (fpl <= 200) contributionRate = 0.02;
      else if (fpl <= 250) contributionRate = 0.04;
      else if (fpl <= 300) contributionRate = 0.06;
      else if (fpl <= 400) contributionRate = 0.085;
      else contributionRate = 0.12; 
      const fplBase = 15060 + (householdSize - 1) * 5380;
      const income = (fpl / 100) * fplBase;
      const monthlyCapped = (income * contributionRate) / 12;
      points.push({
        fpl,
        capped: Number(monthlyCapped.toFixed(2)),
        market: benchmarkPremium,
        subsidy: Math.max(0, benchmarkPremium - monthlyCapped)
      });
    }
    return points;
  }, [benchmarkPremium, householdSize]);
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-black tracking-tight">The 2026 Subsidy Cliff Visualization</CardTitle>
        <CardDescription>
          Comparing capped premiums (ARPA) vs. full market cost beyond 400% FPL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className="h-[350px] w-full mt-4" 
          aria-describedby={`${chartId}-desc`}
          role="img"
          aria-label="Graph showing the sharp increase in healthcare premiums at 400 percent of the Federal Poverty Level"
        >
          <ResponsiveContainer width="100%" height="100%" id={chartId}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCapped" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="fpl"
                tickFormatter={(v) => `${v}%`}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                labelFormatter={(label) => `${label}% FPL`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Area
                type="monotone"
                dataKey="capped"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorCapped)"
                strokeWidth={3}
                name="Capped Premium"
              />
              <Area
                type="monotone"
                dataKey="market"
                stroke="#94a3b8"
                fill="transparent"
                strokeDasharray="5 5"
                name="Market Cost"
              />
              <ReferenceLine x={400} stroke="#ef4444" strokeWidth={2}>
                <Label value="2026 CLIFF" position="top" fill="#ef4444" fontSize={10} fontWeight="bold" />
              </ReferenceLine>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p id={`${chartId}-desc`} className="sr-only">
          This chart visualizes the 2026 healthcare subsidy cliff. It shows premium contributions capped at 8.5% of income up to 400% FPL, after which they jump significantly to 12% or higher.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
          <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold" aria-hidden="true">!</div>
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Forensic Note:</strong> At 400% FPL, the ARPA subsidy expansion is projected to expire in 2026. Households just $1 over this limit face an immediate jump to full market rates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
SubsidyCliffChart.displayName = "SubsidyCliffChart";