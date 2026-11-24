import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
interface EOBUploaderProps {
  onSuccess: (data: { cpt: string; amount: number; dx: string; patientToken?: string }) => void;
}
export function EOBUploader({ onSuccess }: EOBUploaderProps) {
  const [stage, setStage] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [patientToken, setPatientToken] = useState<string | null>(null);
  const simulateUpload = async () => {
    setStage('uploading');
    setProgress(20);
    // X12 Simulation String
    const x12Payload = `ISA*00*          *00*          *ZZ*FAIRMED        *ZZ*PAYER          *240520*1024*^*00501*000000001*0*P*:~CLM*1234*450.00***11:B:1*Y*A*Y*Y~SV1*HC:99215*450.00*UN*1***1:2:3**Y~SE*10*0001~`;
    try {
      // 1. Send chunk to real API
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chunk: x12Payload,
          patientRef: "PAT-" + Math.floor(Math.random() * 100000)
        })
      });
      const result = await response.json();
      setProgress(60);
      if (result.success && result.data.length > 0) {
        setStage('analyzing');
        const claim = result.data[0];
        setPatientToken(claim.patientToken);
        setTimeout(() => {
          setProgress(100);
          setStage('done');
          onSuccess({ 
            cpt: claim.cptCode, 
            amount: claim.billedAmount, 
            dx: 'Diagnostic forensic mapping from X12 SV1 segment',
            patientToken: claim.patientToken
          });
          toast.success("Forensic ingestion complete");
        }, 1200);
      } else {
        throw new Error("Ingestion failed");
      }
    } catch (err) {
      toast.error("Forensic bridge failed. Reverting to manual.");
      setStage('idle');
    }
  };
  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center",
        stage === 'idle' ? "hover:border-primary/50 hover:bg-accent/50 cursor-pointer" : "bg-muted/30"
      )}
      onClick={() => stage === 'idle' && simulateUpload()}
    >
      {stage === 'idle' && (
        <>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <h4 className="font-bold text-lg">Forensic Claim Ingestor</h4>
          <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
            Drag and drop EOB (PDF/X12) for automated HMAC patient tokenization.
          </p>
          <Button variant="outline" size="sm" className="mt-4">Select File</Button>
        </>
      )}
      {(stage === 'uploading' || stage === 'analyzing') && (
        <div className="w-full space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
          <div className="space-y-2">
            <h4 className="font-bold">
              {stage === 'uploading' ? 'Tokenizing Patient...' : 'Parsing X12 Segments...'}
            </h4>
            <Progress value={progress} className="h-2 w-full max-w-[200px] mx-auto" />
          </div>
          <p className="text-xs text-muted-foreground font-mono">HMAC-SHA256: Processing...</p>
        </div>
      )}
      {stage === 'done' && (
        <div className="space-y-4 animate-in zoom-in-95 duration-300">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <div>
            <h4 className="font-bold">Ingestion Complete</h4>
            <div className="mt-2 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-mono font-bold text-emerald-700">TOKEN: {patientToken}</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setStage('idle')}>Ingest Another</Button>
        </div>
      )}
    </div>
  );
}