import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api-client';
import { HospitalPerformance } from '@shared/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Info, Target, TrendingDown } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';
export function WallOfValuePage() {
  const [locality, setLocality] = useState('PA01');
  const { data: hospitals, isLoading } = useQuery({
    queryKey: ['wall-of-value', locality],
    queryFn: () => api<HospitalPerformance[]>(`/api/wall-of-value?locality=${locality}`)
  });
  const topPerformer = hospitals?.[0];
  return (
    <AppLayout container contentClassName="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <Trophy className="h-10 w-10 text-amber-500" />
            Wall of Value
          </h1>
          <p className="text-xl text-muted-foreground">
            Ranking Pennsylvania healthcare providers by fair pricing adherence and transparency for 2026.
          </p>
        </div>
        <Card className="min-w-[240px]">
          <CardHeader className="p-4 pb-0">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Regional Focus</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Select value={locality} onValueChange={setLocality}>
              <SelectTrigger>
                <SelectValue placeholder="Locality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PA01">PA01 - Philadelphia</SelectItem>
                <SelectItem value="PA02">PA02 - Pittsburgh</SelectItem>
                <SelectItem value="PA03">PA03 - Allentown</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm border-primary/10 bg-primary/[0.01]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Regional Performance Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Rank</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Variance Index</TableHead>
                  <TableHead>Transparency</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10">Loading rankings...</TableCell></TableRow>
                ) : hospitals?.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-black text-lg">{h.rank}</TableCell>
                    <TableCell className="font-semibold">{h.name}</TableCell>
                    <TableCell>
                      <Badge variant={h.varianceIndex < 10 ? 'default' : h.varianceIndex < 25 ? 'secondary' : 'destructive'} className="font-mono">
                        {h.varianceIndex > 0 ? `+${h.varianceIndex}%` : `${h.varianceIndex}%`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${h.transparencyScore}%` }} />
                        </div>
                        <span className="text-[10px] font-bold">{h.transparencyScore}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-mono text-xs">{h.claimCount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="space-y-8">
          <Card className="bg-primary text-primary-foreground overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary-foreground/70 font-bold uppercase text-[10px]">Regional Champion</CardDescription>
              <CardTitle className="text-2xl">{topPerformer?.name || '---'}</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ name: 'Alignment', value: 100 - (topPerformer?.varianceIndex || 0), fill: '#fff' }]} startAngle={180} endAngle={0}>
                  <RadialBar background dataKey="value" cornerRadius={10} />
                  <RechartsTooltip />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="text-center -mt-10">
                <span className="text-3xl font-black">{(100 - (topPerformer?.varianceIndex || 0)).toFixed(0)}%</span>
                <p className="text-[10px] font-bold uppercase opacity-70">Fair Market Alignment</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-emerald-500" />
                Equity Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Estimated Savings Potential</p>
                <p className="text-2xl font-black text-primary">$1.42M</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Adhering to the Fair Price benchmark in {locality} could reduce regional healthcare spend by up to 18% annually.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}