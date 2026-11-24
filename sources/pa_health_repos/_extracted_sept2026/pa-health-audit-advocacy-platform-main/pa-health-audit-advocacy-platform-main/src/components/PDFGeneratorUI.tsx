import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSignatureCanvas } from "@/hooks/useSignatureCanvas";
import { generatePdfFromTemplate } from "@/lib/reportGenerator";
import { ReportJSON } from "@/lib/types";
import { ShieldCheck, Eraser, Download, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
interface PDFGeneratorUIProps {
  reportData: ReportJSON;
  fileName?: string;
  triggerLabel?: string;
}
export function PDFGeneratorUI({ 
  reportData, 
  fileName = "Forensic-Audit-Report.pdf",
  triggerLabel = "Export Signed Report"
}: PDFGeneratorUIProps) {
  const { 
    canvasRef, 
    hasSignature, 
    startDrawing, 
    draw, 
    stopDrawing, 
    clearSignature, 
    getSignatureDataUrl 
  } = useSignatureCanvas();
  const [includeSignature, setIncludeSignature] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  // Memory Management: Revoke old object URLs
  useEffect(() => {
    return () => {
      if (lastUrl) URL.revokeObjectURL(lastUrl);
    };
  }, [lastUrl]);
  const handleGenerate = async () => {
    setIsGenerating(true);
    const signature = includeSignature ? getSignatureDataUrl() : undefined;
    const generationPromise = async () => {
      try {
        const pdfBytes = await generatePdfFromTemplate(reportData, undefined, signature ?? undefined);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        setLastUrl(url);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        return { url };
      } catch (err) {
        console.error("PDF Generation Error:", err);
        throw err;
      }
    };
    toast.promise(generationPromise(), {
      loading: 'Synthesizing forensic PDF...',
      success: (data) => (
        <div className="flex flex-col gap-1">
          <span className="font-bold">Export Successful</span>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto w-fit text-blue-600"
            onClick={() => window.open(data.url, '_blank')}
          >
            Open in New Tab
          </Button>
        </div>
      ),
      error: 'Critical failure during document synthesis.',
    });
    setIsGenerating(false);
  };
  return (
    <Card className="border-2 shadow-xl overflow-hidden">
      <CardHeader className="bg-slate-50 border-b py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm font-black uppercase tracking-widest">Attestation & Export</CardTitle>
        </div>
        <CardDescription className="text-[10px] font-medium">
          Authorize and sign the forensic findings for institutional record-keeping.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-sig" 
              checked={includeSignature} 
              onCheckedChange={(checked) => setIncludeSignature(!!checked)} 
            />
            <Label htmlFor="include-sig" className="text-xs font-bold uppercase cursor-pointer">
              Embed Digital Signature Stamp
            </Label>
          </div>
          {includeSignature && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Signature Input</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearSignature} 
                  className="h-6 text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Eraser className="h-3 w-3 mr-1" /> Clear
                </Button>
              </div>
              <div className="relative group">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  className="w-full h-32 border-2 border-dashed rounded-xl bg-white cursor-crosshair touch-none transition-colors group-hover:border-slate-300"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sign Here</p>
                  </div>
                )}
                {hasSignature && (
                  <div className="absolute top-2 right-2 pointer-events-none">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || (includeSignature && !hasSignature)}
          className="w-full h-12 font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
        >
          {isGenerating ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Download className="h-5 w-5 mr-2" />
          )}
          {triggerLabel}
        </Button>
        <div className="pt-2">
          <p className="text-[9px] text-muted-foreground leading-tight italic text-center">
            Note: Exported documents include a cryptographically hashed Report ID for forensic verification.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}