import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calculator, AlertTriangle, Loader2, Database, Info, ShieldAlert, Activity, History, RefreshCw, Fingerprint } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FairnessGauge } from '@/components/FairnessGauge';
import { AppealLetter } from '@/components/AppealLetter';
import { EOBUploader } from '@/components/EOBUploader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AuditRequest, AuditResponse, ApiResponse, ClaimLedgerEntry } from '@shared/types';
export function AuditPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [ledger, setLedger] = useState<ClaimLedgerEntry[]>([]);
  const [formData, setFormData] = useState<AuditRequest>({
    cptCode: searchParams.get('cpt') || '',
    zipCode: searchParams.get('zip') || '',
    billedAmount: 0,
    diagnosis: ''
  });
  const fetchLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const res = await fetch('/api/ledger');
      const data = await res.json();
      if (data.success) setLedger(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLedgerLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);
  const runAudit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.cptCode || !formData.zipCode || formData.billedAmount <= 0) {
      toast.error('Please fill in required fields');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json() as ApiResponse<AuditResponse>;
      if (data.success && data.data) {
        setResult(data.data);
        toast.success('Forensic audit complete');
        // Refresh ledger to show the new manual audit record
        fetchLedger();
      }
    } catch (err) {
      toast.error('Audit service unavailable');
    } finally {
      setLoading(false);
    }
  };
  const triggerBatchAudit = async () => {
    setLedgerLoading(true);
    try {
      const res = await fetch('/api/ledger/audit', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLedger(data.data);
        toast.success(`Processed ${data.auditedCount} pending claims`);
      }
    } catch (e) {
      toast.error("Batch audit failed");
    } finally {
      setLedgerLoading(false);
    }
  };
  const onUploadSuccess = (data: { cpt: string; amount: number; dx: string; patientToken?: string }) => {
    setFormData(prev => ({ ...prev, cptCode: data.cpt, billedAmount: data.amount, diagnosis: data.dx }));
    fetchLedger();
  };
  const chartData = result ? [
    { name: 'Your Bill', amount: formData.billedAmount, fill: formData.billedAmount > result.benchmark.fairMarketValue ? '#f43f5e' : '#10b981' },
    { name: 'Fair Market', amount: result.benchmark.fairMarketValue, fill: '#3b82f6' },
    { name: 'Medicare', amount: result.benchmark.medicareRate, fill: '#64748b' }
  ] : [];
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-6">
            <EOBUploader onSuccess={onUploadSuccess} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" /> Audit Manual Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={runAudit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>CPT Code</Label>
                    <Input value={formData.cptCode} onChange={e => setFormData({...formData, cptCode: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Billed Amount ($)</Label>
                    <Input type="number" value={formData.billedAmount || ''} onChange={e => setFormData({...formData, billedAmount: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Diagnosis</Label>
                    <Input value={formData.diagnosis} placeholder="Reason for visit" onChange={e => setFormData({...formData, diagnosis: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Run Analysis'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-8 space-y-6">
            {!result ? (
              <div className="h-[500px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-12 space-y-6 bg-muted/20">
                <div className="bg-primary/10 p-6 rounded-full">
                  <Database className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-bold">Ready for Forensic Audit</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    Ingest X12 segments or enter data to begin HIPAA-compliant patient tokenization and variance detection.
                  </p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="flex flex-col items-center justify-center p-6 h-64">
                    <CardTitle className="text-sm text-muted-foreground mb-4">Integrity Score</CardTitle>
                    <FairnessGauge score={result.fairnessScore} />
                  </Card>
                  <Card className="p-6 h-64">
                    <CardTitle className="text-sm text-muted-foreground mb-4">Cost Variance Comparison</CardTitle>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis hide />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>Appeal Action Plan</CardTitle></CardHeader>
                  <CardContent>
                    <AppealLetter 
                      draft={result.appeal} 
                      cpt={formData.cptCode} 
                      amount={formData.billedAmount} 
                      savings={result.variance}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
            <div className="pt-8">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                    <History className="h-6 w-6 text-primary" /> Forensic Claim Ledger
                  </h2>
                  <p className="text-sm text-muted-foreground">Historical records of tokenized ingestions and their risk profiles.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchLedger} disabled={ledgerLoading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", ledgerLoading && "animate-spin")} />
                    Sync
                  </Button>
                  <Button variant="secondary" size="sm" onClick={triggerBatchAudit} disabled={ledgerLoading}>
                    Run Audit Logic
                  </Button>
                </div>
              </div>
              <Card className="overflow-hidden border-primary/20">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Patient Token</TableHead>
                      <TableHead>CPT</TableHead>
                      <TableHead>Billed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Risk Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                          No forensic records found in current session.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledger.map((entry) => (
                        <TableRow key={entry.id} className="group">
                          <TableCell className="font-mono text-xs flex items-center gap-2">
                            <Fingerprint className="h-3 w-3 text-muted-foreground" />
                            {entry.patientToken}
                          </TableCell>
                          <TableCell className="font-bold">{entry.cptCode}</TableCell>
                          <TableCell>${entry.billedAmount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={entry.status === 'AUDITED' ? 'outline' : 'secondary'} className="text-[10px]">
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={cn(
                              "text-[10px]",
                              entry.riskLevel === 'HIGH' ? "bg-rose-500" :
                              entry.riskLevel === 'MEDIUM' ? "bg-orange-500" : "bg-emerald-500"
                            )}>
                              {entry.riskLevel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}