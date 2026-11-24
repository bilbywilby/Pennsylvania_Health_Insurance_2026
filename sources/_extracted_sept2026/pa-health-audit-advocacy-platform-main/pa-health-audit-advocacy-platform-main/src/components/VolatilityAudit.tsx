import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
const regionalData = [
  { area: "RA8 (Philly)", change: 37.8, carrier: "Ambetter", note: "Silver Loading spike detected" },
  { area: "RA6 (Lehigh)", change: 24.6, carrier: "Capital", note: "Lehigh Valley pricing war" },
  { area: "RA1 (Pitt)", change: 24.8, carrier: "UPMC", note: "Provider-Led shift" },
  { area: "RA3 (Central)", change: 10.1, carrier: "Jefferson", note: "Strategic HMO Efficiency" },
];
export function VolatilityAudit() {
  return (
    <Card className="w-full bg-slate-950/50 backdrop-blur-xl border-slate-800 text-white overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          2026 Forensic Volatility Benchmark
        </CardTitle>
        <CardDescription className="text-slate-400">
          Comparing forensic market outliers (Jefferson 10.1% vs Ambetter 37.8%) across key Rating Areas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="h-[300px] w-full mt-4"
          role="graphics-document"
          aria-label="Bar chart showing 2026 projected healthcare premium changes across Pennsylvania rating areas"
        >
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <BarChart data={regionalData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis
                dataKey="area"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v === 0 ? "0%" : `${v}%`}
                domain={[0, 'auto']}
              />
              <Tooltip
                cursor={{ fill: '#1e293b' }}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                formatter={(value: number, name: string, props: any) => {
                  const carrier = props?.payload?.carrier ?? 'Carrier Unknown';
                  return [
                    `${value}% (${carrier})`,
                    'Projected Shift'
                  ];
                }}
              />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
              <Bar
                dataKey="change"
                radius={[4, 4, 0, 0]}
                name="Projected Change"
              >
                {regionalData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.change > 30 ? '#ef4444' : entry.change > 20 ? '#f59e0b' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {regionalData.map((d) => (
            <div key={d.area} className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <p className="text-[10px] uppercase font-bold text-slate-500">{d.area}</p>
              <div className="flex items-end justify-between">
                <p className="text-lg font-black text-white">{d.change}%</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase">{d.carrier}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}