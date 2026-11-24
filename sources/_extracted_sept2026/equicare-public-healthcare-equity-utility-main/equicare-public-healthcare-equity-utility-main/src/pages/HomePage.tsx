import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api-client';
import { Tenant, Claim, AuditSummary, HospitalPerformance } from '@shared/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClaimLedgerTable } from '@/components/ClaimLedgerTable';
import { IngestionZone } from '@/components/IngestionZone';
import { RiskAnalysisCharts } from '@/components/RiskAnalysisCharts';
import { ShieldCheck, Activity, BarChart3, FileUp, Trophy, ArrowRight, Gavel, Target, FileSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
export function HomePage() {
  const [selectedTenant, setSelectedTenant] = useState<string>('t1');
  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api<Tenant[]>('/api/tenants')
  });
  const selectedLocality = tenants?.find(t => t.id === selectedTenant)?.locality || 'PA01';
  const { data: ledger, refetch: refetchLedger } = useQuery({
    queryKey: ['ledger', selectedTenant],
    queryFn: () => api<Claim[]>(`/api/ledger?tenant_id=${selectedTenant}`)
  });
  const { data: hospitals } = useQuery({
    queryKey: ['wall-of-value', selectedLocality],
    queryFn: () => api<HospitalPerformance[]>(`/api/wall-of-value?locality=${selectedLocality}`)
  });
  const summary: AuditSummary = React.useMemo(() => {
    if (!ledger) return { totalClaims: 0, totalBilled: 0, potentialSavings: 0, riskDistribution: { LOW: 0, MED: 0, HIGH: 0 }, activeTenants: tenants?.length || 0 };
    return ledger.reduce((acc, c) => {
      acc.totalClaims++;
      acc.totalBilled += c.billedAmount;
      if (c.status === 'AUDITED' && c.fmvResult) acc.potentialSavings += Math.max(0, c.billedAmount - c.fmvResult);
      acc.riskDistribution[c.riskLevel]++;
      return acc;
    }, { totalClaims: 0, totalBilled: 0, potentialSavings: 0, riskDistribution: { LOW: 0, MED: 0, HIGH: 0 }, activeTenants: tenants?.length || 0 });
  }, [ledger, tenants]);
  return (
    <AppLayout className="bg-slate-50/50 dark:bg-slate-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-black tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              PA 2026 Health Equity Engine
            </h1>
            <p className="text-muted-foreground">Regulatory compliance monitoring and claim analysis.</p>
          </div>
          <div className="flex items-center gap-3 bg-card p-2 rounded-xl border shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">Organization</span>
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="w-[240px] border-none shadow-none focus:ring-0">
                <SelectValue placeholder="Select Tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants?.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.locality})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Active Ledger" value={summary.totalClaims} icon={Activity} />
          <MetricCard title="Audit Status" value="COMPLIANT" icon={ShieldCheck} badge="2026 STANDARDS" />
          <MetricCard title="Total Audited" value={`$${summary.totalBilled.toLocaleString()}`} icon={BarChart3} />
          <MetricCard title="Recoverable" value={`$${summary.potentialSavings.toLocaleString()}`} icon={Trophy} trend="-12% vs last month" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="ledger" className="space-y-6">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="ledger" className="gap-2"><Activity className="h-4 w-4" /> Ledger</TabsTrigger>
                <TabsTrigger value="risk" className="gap-2"><BarChart3 className="h-4 w-4" /> Risk</TabsTrigger>
                <TabsTrigger value="wall" className="gap-2"><Target className="h-4 w-4" /> Wall of Value</TabsTrigger>
                <TabsTrigger value="uploads" className="gap-2"><FileUp className="h-4 w-4" /> Ingest</TabsTrigger>
              </TabsList>
              <TabsContent value="ledger">
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Global Transaction Ledger</CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px]">Live Feed</Badge>
                  </CardHeader>
                  <CardContent>
                    <ClaimLedgerTable data={ledger || []} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="risk">
                <RiskAnalysisCharts data={ledger || []} />
              </TabsContent>
              <TabsContent value="wall">
                <Card className="shadow-sm border-slate-200">
                  <CardHeader>
                    <CardTitle>Regional Facility Performance</CardTitle>
                    <CardDescription>Hospital rankings based on variance index for {selectedLocality}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Hospital</TableHead>
                          <TableHead>Variance</TableHead>
                          <TableHead>Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hospitals?.slice(0, 5).map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="font-bold">#{h.rank}</TableCell>
                            <TableCell className="font-medium">{h.name}</TableCell>
                            <TableCell>
                              <Badge variant={h.varianceIndex < 20 ? 'default' : 'destructive'} className="font-mono text-[10px]">
                                +{h.varianceIndex}%
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{h.transparencyScore}/100</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="uploads">
                <IngestionZone tenantId={selectedTenant} onComplete={() => refetchLedger()} />
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-6">
            <Card className="bg-primary text-primary-foreground border-none shadow-xl">
              <CardHeader>
                <CardDescription className="text-primary-foreground/70 font-bold uppercase text-[10px]">Strategic Action</CardDescription>
                <CardTitle className="text-xl">Audit Appeals Hub</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm opacity-90 leading-relaxed">System identified 3 high-variance claims suitable for regulatory appeal in the last 24 hours.</p>
                <Button variant="secondary" className="w-full font-bold shadow-lg" asChild>
                  <Link to="/appeals">
                    Launch Audit Appeal
                    <Gavel className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  Transparency Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[10px] text-muted-foreground leading-tight">Review cryptographically signed MRF manifests published to R2 storage for regulatory auditing.</p>
                <Button variant="ghost" className="w-full text-xs h-8" asChild>
                  <Link to="/smoke">Review Manifests</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-amber-600 tracking-wider">
                  PA Health Equity Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] leading-relaxed">
                  Notice: Payer Highmark updated outpatient medians for PA01 locality. Benchmarks automatically recalculated.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
function MetricCard({ title, value, icon: Icon, badge, trend }: any) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-black">{value}</h3>
          </div>
          <div className="p-2 bg-primary/5 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {(badge || trend) && (
          <div className="mt-4 flex items-center gap-2">
            {badge && <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tight">{badge}</Badge>}
            {trend && <span className="text-[10px] text-emerald-600 font-bold">{trend}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}