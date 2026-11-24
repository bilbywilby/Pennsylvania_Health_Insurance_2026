import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Landmark, TrendingDown, TrendingUp, Filter, Search, Award } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { FacilityStats } from '@shared/types';
export function WallOfValuePage() {
  const [region, setRegion] = useState('All');
  const [search, setSearch] = useState('');
  const { data: stats, isLoading } = useQuery({
    queryKey: ['wall-of-value'],
    queryFn: async () => {
      const res = await fetch('/api/transparency');
      const json = await res.json();
      return json.data as FacilityStats[] || [];
    }
  });
  const filteredStats = stats?.filter(s => 
    (region === 'All' || s.region.includes(region)) &&
    s.facilityName.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.varianceIndex - b.varianceIndex);
  const getBarColor = (index: number, total: number) => {
    const perc = (index / total) * 100;
    if (perc <= 15) return '#10b981'; // Green (Value)
    if (perc >= 85) return '#f43f5e'; // Red (Predatory)
    return '#f59e0b'; // Amber (Standard)
  };
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">2026 Price Projections</Badge>
              <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight">Wall of <span className="text-primary italic">Value</span></h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Ranking Pennsylvania health systems by their Variance Index. Identifying hospitals that align with Medicare baselines vs predatory outliers.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search Hospital..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Regions</SelectItem>
                  <SelectItem value="Philadelphia">Philadelphia</SelectItem>
                  <SelectItem value="Pittsburgh">Pittsburgh</SelectItem>
                  <SelectItem value="Lehigh">Lehigh Valley</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg">Market Variance Distribution</CardTitle>
              <CardDescription>Variance Index V_i = (Hospital Avg - PA Median) / Median %</CardDescription>
            </CardHeader>
            <div className="h-[400px] mt-6">
              {isLoading ? (
                <div className="h-full w-full bg-muted animate-pulse rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="facilityName" hide />
                    <YAxis label={{ value: 'Variance %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      cursor={{fill: 'hsl(var(--muted)/0.3)'}}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as FacilityStats;
                          return (
                            <div className="bg-popover border p-3 rounded-lg shadow-xl">
                              <div className="font-bold text-sm">{data.facilityName}</div>
                              <div className="text-xs text-muted-foreground">{data.region}</div>
                              <div className={cn("text-lg font-bold mt-1", data.varianceIndex > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {data.varianceIndex.toFixed(1)}% Variance
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="varianceIndex" radius={[4, 4, 0, 0]}>
                      {filteredStats?.map((entry, index) => (
                        <Cell key={index} fill={getBarColor(index, filteredStats.length)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Hospital System</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Avg. Multiplier</TableHead>
                  <TableHead>Variance Index</TableHead>
                  <TableHead className="text-right">Value Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={5} className="h-16 bg-muted/20 animate-pulse" /></TableRow>) :
                  filteredStats?.map((f, i) => (
                    <TableRow key={f.facilityName} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", i < 2 ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>
                            {i < 2 ? <Award className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                          </div>
                          <span className="font-bold group-hover:text-primary transition-colors">{f.facilityName}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{f.region}</Badge></TableCell>
                      <TableCell className="font-medium">{f.avgMultiplier.toFixed(1)}x Medicare</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={cn("font-bold", f.varianceIndex > 0 ? "text-rose-600" : "text-emerald-600")}>
                            {f.varianceIndex > 0 ? '+' : ''}{f.varianceIndex.toFixed(1)}%
                          </span>
                          {f.trend > 0 ? <TrendingUp className="h-3 w-3 text-rose-500" /> : <TrendingDown className="h-3 w-3 text-emerald-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold uppercase tracking-tighter opacity-70">Score: {f.valueScore.toFixed(0)}</span>
                          <Progress value={f.valueScore} className={cn("w-24 h-1.5", f.valueScore > 80 ? "[&>div]:bg-emerald-500" : f.valueScore < 40 ? "[&>div]:bg-rose-500" : "")} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}