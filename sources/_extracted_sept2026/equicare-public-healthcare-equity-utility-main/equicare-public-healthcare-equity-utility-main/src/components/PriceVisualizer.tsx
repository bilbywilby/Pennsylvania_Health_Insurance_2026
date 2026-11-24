import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
interface PriceVisualizerProps {
  fairPrice: number;
  avgPrice: number;
  marketRange: [number, number];
}
export function PriceVisualizer({ fairPrice, avgPrice, marketRange }: PriceVisualizerProps) {
  const data = [
    { name: 'EquiCare Fair Price', value: fairPrice, color: '#0F766E' },
    { name: 'National Average', value: avgPrice, color: '#94A3B8' },
    { name: 'Typical Maximum', value: marketRange[1], color: '#F43F5E' },
  ];
  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={120} 
            fontSize={12} 
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-bold">{payload[0].payload.name}</p>
                    <p className="text-primary font-mono">${payload[0].value?.toLocaleString()}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
          <ReferenceLine x={fairPrice} stroke="#0F766E" strokeDasharray="3 3" label={{ value: 'Target', position: 'top', fill: '#0F766E', fontSize: 10 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}