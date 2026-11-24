import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { ShieldCheck, Database, FileText, Loader2, Play, Terminal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
export function SmokeTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };
  const runScrape = async () => {
    setLoading('scrape');
    addLog('Initiating MRF Scrape for Highmark PA...');
    try {
      const res = await api<any>('/api/scrape-payers', { method: 'POST', body: JSON.stringify({ payer: 'Highmark' }) });
      addLog(`Success: Upserted ${res.count} benchmarks with FMV percentiles.`);
      toast.success('Payer scrape complete');
    } catch (e) {
      addLog('Error: Failed to fetch MRF data.');
    } finally {
      setLoading(null);
    }
  };
  const publishManifest = async () => {
    setLoading('manifest');
    addLog('Generating R2 Transparency Manifest...');
    try {
      const res = await api<any>('/api/publish-manifest', { method: 'POST', body: JSON.stringify({ payer: 'UPMC' }) });
      addLog(`Success: Published manifest ${res.id} with HMAC signature ${res.signature}.`);
      toast.success('Manifest published');
    } catch (e) {
      addLog('Error: Failed to sign manifest.');
    } finally {
      setLoading(null);
    }
  };
  const simulateClaims = async () => {
    setLoading('claims');
    addLog('Generating 500 Stress Claims...');
    try {
      await api<any>('/api/simulate/claims', { method: 'POST', body: JSON.stringify({ tenantId: 't1', count: 500 }) });
      addLog('Success: 500 claims committed to Durable Object ledger.');
      toast.success('Claims simulated');
    } catch (e) {
      addLog('Error: Contention on ledger commit.');
    } finally {
      setLoading(null);
    }
  };
  return (
    <AppLayout container contentClassName="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Regulatory Smoke Test</h1>
        <p className="text-muted-foreground">Internal utility for PA Health Equity 2026 validation.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600" />
              Ingestion Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Pull latest MRF CSV/JSON from payer portals.</p>
            <Button size="sm" onClick={runScrape} disabled={!!loading} className="w-full">
              {loading === 'scrape' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Trigger Scrape
            </Button>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Manifest Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Cryptographically sign and archive benchmarks.</p>
            <Button size="sm" onClick={publishManifest} disabled={!!loading} className="w-full">
              {loading === 'manifest' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Publish R2
            </Button>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Terminal className="h-4 w-4 text-amber-600" />
              Stress Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Bulk generate claims for ledger validation.</p>
            <Button size="sm" onClick={simulateClaims} disabled={!!loading} className="w-full">
              {loading === 'claims' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Gen 500 Claims
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-slate-950 text-slate-50 border-none">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-xs font-mono flex items-center gap-2">
            <Terminal className="h-3 w-3" />
            System Runtime Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] p-4 font-mono text-xs">
            {logs.length === 0 && <span className="text-slate-500 italic">No activity recorded...</span>}
            {logs.map((log, i) => (
              <div key={i} className="mb-1 leading-relaxed">
                <span className="text-emerald-500 mr-2">$</span>
                {log}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </AppLayout>
  );
}