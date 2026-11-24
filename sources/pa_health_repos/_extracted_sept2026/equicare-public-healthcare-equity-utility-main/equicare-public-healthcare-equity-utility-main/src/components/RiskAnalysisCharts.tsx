import React from 'react';
import { Claim } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
interface RiskAnalysisChartsProps {
  data: Claim[];
}
export function RiskAnalysisCharts({ data }: RiskAnalysisChartsProps) {
  const riskCounts = data.reduce((acc: any, c) => {
    acc[c.riskLevel] = (acc[c.riskLevel] || 0) + 1;
    return acc;
  }, { LOW: 0, MED: 0, HIGH: 0 });
  const pieData = Object.keys(riskCounts).map(k => ({ name: k, value: riskCounts[k] }));
  const billedVsFmv = data.filter(c => c.status === 'AUDITED').map(c => ({
    token: c.token,
    billed: c.billedAmount,
    fmv: c.fmvResult || 0
  })).slice(0, 10);
  const COLORS = {
    LOW: '#10b981',
    MED: '#f59e0b',
    HIGH: '#ef4444'
  };
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Portfolio Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Billed vs Fair Market Value</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={billedVsFmv} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="token" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="billed" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={12} name="Billed Amount" />
              <Bar dataKey="fmv" fill="#0F766E" radius={[4, 4, 0, 0]} barSize={12} name="Fair Price (FMV)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}