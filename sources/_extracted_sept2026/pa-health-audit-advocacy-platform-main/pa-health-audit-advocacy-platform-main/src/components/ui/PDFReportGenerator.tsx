import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, Eraser, Download, PenTool, CheckCircle, Loader2 } from "lucide-react";
import { generatePdfFromTemplate } from "@/lib/reportGenerator";
import { ReportJSON } from "@/lib/types";
import { toast } from "sonner";
interface PDFReportGeneratorProps {
  reportData: ReportJSON;
  fileName?: string;
  triggerLabel?: string;
}
export function PDFReportGenerator({
  reportData,
  fileName = "Forensic-Audit-Report.pdf",
  triggerLabel = "Export Signed PDF"
}: PDFReportGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [lastPoint, setLastPoint] = useState<{ x: number, y: number } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);
  const getPos = (e: React.PointerEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5
    };
  };
  const startDrawing = useCallback((e: React.PointerEvent) => {
    setIsDrawing(true);
    const { x, y } = getPos(e);
    setLastPoint({ x, y });
  }, []);
  const draw = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx || !lastPoint) return;
    const { x, y, pressure } = getPos(e);
    ctx.lineWidth = 1 + (pressure * 3);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastPoint({ x, y });
    setHasSignature(true);
  }, [isDrawing, lastPoint]);
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setLastPoint(null);
  };
  const handleGenerate = async () => {
    setStatus('generating');
    const generateAction = async () => {
      let signatureUrl = undefined;
      if (includeSignature && hasSignature && canvasRef.current) {
        signatureUrl = canvasRef.current.toDataURL('image/png');
      }
      const pdfBytes = await generatePdfFromTemplate(reportData, undefined, signatureUrl);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      return { url };
    };
    toast.promise(generateAction(), {
      loading: 'Generating forensic document...',
      success: (data) => {
        setStatus('success');
        return (
          <div className="flex flex-col gap-1">
            <span className="font-bold">Forensic PDF Generated</span>
            <span className="text-xs text-muted-foreground">Document has been authorized and downloaded.</span>
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto w-fit text-blue-600 font-bold"
              onClick={() => window.open(data.url, '_blank')}
            >
              Open in Browser
            </Button>
          </div>
        );
      },
      error: (err) => {
        setStatus('error');
        return `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      },
    });
  };
  return (
    <Card className="border-2 border-slate-200 shadow-xl overflow-hidden bg-white">
      <CardHeader className="bg-slate-50 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Institutional Report Engine
            </CardTitle>
            <CardDescription className="text-[10px] font-bold text-slate-400">SIGNATURE ADVOCACY MODULE ACTIVE</CardDescription>
          </div>
          {hasSignature ? (
            <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 border-none flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Detected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400">Empty</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-3">
          <label className="text-xs font-black uppercase text-slate-500 tracking-tighter">Attestation Signature (Pressure Sensitive)</label>
          <div className="relative group">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl cursor-crosshair bg-slate-50/50 touch-none pointer-events-auto"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              style={{ touchAction: 'none' }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSignature}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eraser className="h-4 w-4 text-slate-400" />
            </Button>
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-2">
                  <PenTool className="h-3 w-3" /> Use mouse or touch to sign
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-sig"
            checked={includeSignature}
            onCheckedChange={(v) => setIncludeSignature(!!v)}
          />
          <label htmlFor="include-sig" className="text-xs font-bold text-slate-600 cursor-pointer">
            Include forensic attestation signature in export
          </label>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={status === 'generating' || (includeSignature && !hasSignature)}
          className="w-full h-12 bg-slate-900 text-white font-black hover:bg-slate-800 gap-2"
        >
          {status === 'generating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {triggerLabel}
        </Button>
      </CardContent>
    </Card>
  );
}