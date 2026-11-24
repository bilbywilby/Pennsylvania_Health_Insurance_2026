import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileUp, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
interface IngestionZoneProps {
  tenantId: string;
  onComplete: () => void;
}
export function IngestionZone({ tenantId, onComplete }: IngestionZoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>('');
  const simulateIngestion = async () => {
    setIsProcessing(true);
    // Phase 1: Upload & Scrub
    setPhase('Scrubbing PII via HMAC-SHA256...');
    for (let i = 0; i <= 40; i += 10) {
      setProgress(i);
      await new Promise(r => setTimeout(r, 200));
    }
    // Phase 2: Parse & Store
    setPhase('Parsing EDI segments (CLM, SV1)...');
    for (let i = 40; i <= 80; i += 10) {
      setProgress(i);
      await new Promise(r => setTimeout(r, 200));
    }
    try {
      await api('/api/ingest/837', {
        method: 'POST',
        body: JSON.stringify({ content: 'MOCK_837_DATA', tenantId })
      });
      setProgress(100);
      setPhase('Finalizing Ledger Ingestion...');
      await new Promise(r => setTimeout(r, 500));
      toast.success('Batch ingestion successful', {
        description: '5 claims audited and added to ledger.'
      });
      onComplete();
    } catch (e) {
      toast.error('Ingestion failed');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setPhase('');
      }, 1000);
    }
  };
  return (
    <Card className="border-dashed border-2 bg-secondary/10">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        {!isProcessing ? (
          <>
            <div className="p-4 bg-background rounded-full shadow-sm">
              <FileUp className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <CardTitle>Drop Claims Data</CardTitle>
              <CardDescription>Support for EDI 837 (P/I) and FHIR JSON Bundles</CardDescription>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={simulateIngestion}>Select 837 File</Button>
              <Button variant="outline" size="sm" onClick={simulateIngestion}>Select FHIR Bundle</Button>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              Secured by EquiCare HMAC Scrubbing
            </p>
          </>
        ) : (
          <div className="w-full max-w-sm space-y-6">
            <div className="flex items-center gap-3">
              {progress < 100 ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              <span className="text-sm font-semibold">{phase}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
              <span>0% SECURE_UPLOAD</span>
              <span>100% LEDGER_COMMIT</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}