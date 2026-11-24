import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Scale, TrendingUp, Activity, RefreshCw, CheckCircle2 } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
export function HomePage() {
  const [cpt, setCpt] = useState('');
  const [zip, setZip] = useState('');
  const [counter, setCounter] = useState(1248);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('Checking...');
  const navigate = useNavigate();
  useEffect(() => {
    let mounted = true;
    // Fetch Audit Counter
    fetch('/api/counter')
      .then(r => r.json())
      .then(j => {
        if (mounted && j.success && j.data) setCounter(j.data);
      })
      .catch(console.error);
    // Fetch Last Sync Metadata
    fetch('/api/benchmarks/last-sync')
      .then(r => r.json())
      .then(j => {
        if (mounted && j.success && j.data?.timestamp) {
          try {
            const timeAgo = formatDistanceToNow(new Date(j.data.timestamp), { addSuffix: true });
            setLastSync(timeAgo);
          } catch (e) {
            setLastSync('Recent');
          }
        } else if (mounted) {
          setLastSync('System Cache Active');
        }
      })
      .catch(() => {
        if (mounted) setLastSync('Cached');
      });
    return () => { mounted = false; };
  }, []);
  const handleQuickAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (cpt) params.set('cpt', cpt);
    if (zip) params.set('zip', zip);
    navigate(`/audit?${params.toString()}`);
  };
  const triggerSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully ingested ${data.data.newBenchmarks} new PA benchmarks`);
        setLastSync('Just now');
      }
    } catch (err) {
      toast.error('Sync failed. Using cached benchmarks.');
    } finally {
      setSyncing(false);
    }
  };
  return (
    <PublicLayout>
      <div className="relative overflow-hidden bg-background">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32 relative">
          <div className="flex flex-col items-center text-center space-y-10">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-bold animate-fade-in">
                <Activity className="h-4 w-4 animate-pulse" />
                <span className="tracking-widest uppercase text-xs">Pennsylvania Fairness Ledger</span>
              </div>
              <Badge variant="outline" className="flex items-center gap-2 py-1.5 px-3 border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> PA DOI Data Synced: {lastSync}
              </Badge>
            </div>
            <div className="space-y-6 max-w-4xl">
              <h1 className="text-5xl md:text-8xl font-display font-bold tracking-tight leading-[0.9]">
                Audit Your <br />
                <span className="text-primary italic">Medical Bill</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium">
                Detect upcoding using Medicare-referenced benchmarks for every zip code in Pennsylvania.
              </p>
            </div>
            <Card className="w-full max-w-3xl shadow-2xl border-primary/20 overflow-hidden bg-background/80 backdrop-blur">
              <CardContent className="p-3">
                <form onSubmit={handleQuickAudit} className="flex flex-col md:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="CPT Code or Service (e.g. 73721)"
                      className="pl-12 h-14 bg-transparent border-none focus-visible:ring-0 text-lg font-medium"
                      value={cpt}
                      onChange={(e) => setCpt(e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-40 border-l md:border-l-primary/10">
                    <Input
                      placeholder="Zip Code"
                      className="h-14 bg-transparent border-none focus-visible:ring-0 text-lg font-medium px-6"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="h-14 px-10 text-lg font-bold bg-primary hover:scale-[1.02] transition-transform">
                    Start Audit
                  </Button>
                </form>
              </CardContent>
            </Card>
            <div className="flex flex-wrap justify-center gap-8 pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs font-bold uppercase tracking-widest gap-2"
                onClick={triggerSync}
                disabled={syncing}
              >
                <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
                Sync with PA DOI Portal
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { title: 'Medicare Alignment', desc: 'We calculate Fair Market Value based on local Medicare GPCI adjustments.', icon: Search, bg: 'bg-blue-50', text: 'text-blue-600' },
            { title: 'Fraud Prevention', desc: 'Identifies common upcoding patterns that cost PA families millions annually.', icon: Scale, bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { title: 'Real-time MRF', desc: 'Ingests Machine Readable Files from major insurers to find true market rates.', icon: TrendingUp, bg: 'bg-orange-50', text: 'text-orange-600' }
          ].map((f, i) => (
            <div key={i} className="p-10 rounded-[2.5rem] border bg-card hover:shadow-xl transition-all duration-300">
              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-8", f.bg)}>
                <f.icon className={cn("h-7 w-7", f.text)} />
              </div>
              <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}