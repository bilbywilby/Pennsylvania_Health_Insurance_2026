import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Building2, Search, ArrowUpRight, Scale, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
export function TransparencyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: stats, isLoading } = useQuery({
    queryKey: ['transparency-facilities'],
    queryFn: async () => {
      const res = await fetch('/api/transparency');
      const json = await res.json();
      return json.data || [];
    }
  });
  const filteredStats = stats?.filter((f: any) => 
    f.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.region.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Market Integrity Map</h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Visualizing negotiated rate multipliers across Pennsylvania. We track how far above Medicare facilities charge.
              </p>
            </div>
            <div className="w-full md:w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search Hospital..." 
                  className="pl-10" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Avg PA Multiplier', val: '2.1x', change: 'Medicare Base', color: 'text-blue-500' },
              { label: 'Ingested MRF Records', val: '14.2M', change: 'Updated Live', color: 'text-primary' },
              { label: 'Flagged Variances', val: '842', change: 'This Week', color: 'text-rose-500' }
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="border-b-4 border-b-primary/20">
                  <CardHeader className="pb-2">
                    <CardDescription>{stat.label}</CardDescription>
                    <CardTitle className="text-3xl">{stat.val}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-sm font-medium ${stat.color} flex items-center gap-1`}>
                      <ArrowUpRight className="h-4 w-4" /> {stat.change}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> Facility Variance Audit
                </CardTitle>
                <CardDescription>Negotiated rates vs Medicare baseline for major PA health systems.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Facility</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Avg Multiplier</TableHead>
                      <TableHead className="text-right">Integrity Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={4} className="h-12 bg-muted/20 animate-pulse" /></TableRow>) :
                      filteredStats?.map((f: any) => (
                        <TableRow key={f.facilityName}>
                          <TableCell className="font-bold">{f.facilityName}</TableCell>
                          <TableCell><Badge variant="outline">{f.region}</Badge></TableCell>
                          <TableCell className="text-blue-600 font-medium">{f.avgMultiplier.toFixed(1)}x Medicare</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-muted-foreground">{f.reliability}% Data Density</span>
                              <Progress value={f.reliability} className="w-20 h-1" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    }
                    {!isLoading && filteredStats?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                          No health systems found matching your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5" /> Locality Benchmarks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: 'Philly Metro', score: 2.4 },
                    { name: 'Lehigh Valley', score: 1.8 },
                    { name: 'Scranton/NE', score: 1.6 },
                    { name: 'Pittsburgh', score: 2.1 }
                  ].map(h => (
                    <div key={h.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{h.name}</span>
                        <span className="font-bold text-primary">{h.score}x Medicare</span>
                      </div>
                      <Progress value={(h.score / 3) * 100} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" /> Whistleblower Safe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-emerald-800 leading-relaxed mb-4">
                    PA State Law protects patients and employees reporting billing fraud. Submitting verified EOBs helps us maintain audit accuracy without storing your PII.
                  </p>
                  <button className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-200">
                    Submit Anonymous Tip
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}