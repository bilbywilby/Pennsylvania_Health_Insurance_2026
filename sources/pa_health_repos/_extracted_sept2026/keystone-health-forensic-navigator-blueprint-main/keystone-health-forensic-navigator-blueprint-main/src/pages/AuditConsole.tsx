import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Calculator,
  Database,
  ArrowRightCircle,
  Loader2,
  Lock,
  HelpCircle,
  ShieldHalf,
  EyeOff,
  RefreshCw,
  Sparkles,
  Info
} from "lucide-react";
import {
  scrubPII,
  generateHash,
  calculateVariance,
  PA_2026_MARKET_DATA,
  parseToCents,
  CPT_GLOSSARY
} from "@/lib/forensic-core";
import { useAppState } from "@/hooks/use-app-state";
import { SmartNarrative } from "@/components/dashboard/SmartNarrative";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { v4 as uuidv4 } from 'uuid';
export default function AuditConsole() {
  const isExpertMode = useAppState(s => s.isExpertMode);
  const [cptCode, setCptCode] = useState("99214");
  const [billed, setBilled] = useState("250.00");
  const [specialty, setSpecialty] = useState("Internal Medicine");
  const [pos, setPos] = useState("Office");
  const [narrative, setNarrative] = useState("Patient visited for follow-up on chronic health issues.");
  const [loading, setLoading] = useState(false);
  const [isSealed, setIsSealed] = useState(false);
  const scrubbedNarrative = useMemo(() => scrubPII(narrative), [narrative]);
  const billedCents = useMemo(() => parseToCents(billed), [billed]);
  const marketEntry = useMemo(() => PA_2026_MARKET_DATA[cptCode] || { fmv: 0, carrier: "Unknown" }, [cptCode]);
  const variance = useMemo(() => calculateVariance(billedCents, marketEntry.fmv), [billedCents, marketEntry.fmv]);
  const recordHash = useMemo(() => generateHash({
    cptCode, billedCents, specialty, pos, narrative: scrubbedNarrative, marketBaseline: marketEntry
  }), [cptCode, billedCents, specialty, pos, scrubbedNarrative, marketEntry]);
  const handleSeal = async () => {
    toast.info("Initializing Secure Protocol", { description: "Applying SHA-256 seal to audit payload." });
    setLoading(true);
    try {
      const record = {
        id: uuidv4(), cptCode, billedCents, providerSpecialty: specialty,
        placeOfService: pos as any, narrative: scrubbedNarrative,
        timestamp: new Date().toISOString(), recordHash, marketBaseline: marketEntry, variance
      };
      await api('/api/audit-records', { method: 'POST', body: JSON.stringify(record) });
      toast.success("Record Sealed", { description: "Cryptographically signed and stored on the immutable ledger." });
      setIsSealed(true);
    } catch (err) {
      toast.error("Seal Failed", { description: "Unable to commit to the secure network node." });
    } finally {
      setLoading(false);
    }
  };
  const loadExample = (type: 'upcoding' | 'nominal') => {
    if (type === 'upcoding') {
      setCptCode("99215");
      setBilled("450.00");
      setNarrative("Patient came in for a simple cough check, but was billed for a high-intensity comprehensive visit.");
    } else {
      setCptCode("99213");
      setBilled("130.00");
      setNarrative("Routine follow up for blood pressure check. Standard pricing applied.");
    }
    toast.success(`${type === 'upcoding' ? 'Risk' : 'Nominal'} example loaded`);
  };
  return (
    <AppLayout className="bg-slate-950 min-h-screen text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <ShieldCheck className="text-sky-400 size-8" />
                  {isExpertMode ? "Audit Console" : "Bill Checker"}
                </h1>
                <p className="text-slate-400 text-sm">
                  {isExpertMode ? "LMP-256 Forensic Entry Terminal." : "Check if your doctor's bill is fair."}
                </p>
              </div>
              {!isSealed && (
                <div className="flex gap-2 mb-1">
                  <Button variant="outline" size="sm" onClick={() => loadExample('nominal')} className="text-[9px] h-7 border-emerald-500/20 text-emerald-500">GOOD BILL EX.</Button>
                  <Button variant="outline" size="sm" onClick={() => loadExample('upcoding')} className="text-[9px] h-7 border-rose-500/20 text-rose-500">BAD BILL EX.</Button>
                </div>
              )}
            </div>
            <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl">
              <AnimatePresence>
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="relative size-16 mx-auto">
                        <RefreshCw className="size-16 text-sky-500 animate-spin" />
                        <Lock className="absolute inset-0 m-auto size-6 text-sky-400" />
                      </div>
                      <p className="text-sky-400 font-mono text-xs tracking-widest animate-pulse">SEALING RECORD...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="h-1.5 bg-gradient-to-r from-sky-500 to-indigo-600" />
              <CardContent className="pt-8 space-y-6">
                <TooltipProvider>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                        {isExpertMode ? "Service Code (CPT)" : "What was the visit for?"}
                      </Label>
                      <Select disabled={isSealed} value={cptCode} onValueChange={setCptCode}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 h-11 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                          {Object.keys(CPT_GLOSSARY).map(code => (
                            <SelectItem key={code} value={code}>Code {code} ({CPT_GLOSSARY[code].label})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                        {isExpertMode ? "Billed Amount ($)" : "How much were you charged?"}
                      </Label>
                      <Input
                        disabled={isSealed}
                        value={billed}
                        onChange={(e) => setBilled(e.target.value)}
                        className="bg-slate-950 border-slate-800 font-mono h-11 rounded-xl"
                      />
                    </div>
                  </div>
                </TooltipProvider>
                {!isSealed && (
                  <div className="space-y-4 py-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Simulate Price Change</Label>
                      <span className="text-[10px] font-mono text-sky-400">${billed}</span>
                    </div>
                    <Slider
                      value={[parseFloat(billed) || 0]}
                      max={1000}
                      step={5}
                      onValueChange={(val) => setBilled(val[0].toFixed(2))}
                      className="py-4"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Visit Notes</Label>
                  <Textarea
                    disabled={isSealed}
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    className="bg-slate-950 border-slate-800 min-h-[100px] rounded-xl resize-none text-xs font-mono"
                    placeholder="Briefly describe what happened..."
                  />
                </div>
                <Button
                  onClick={handleSeal}
                  disabled={loading || isSealed}
                  className={cn("w-full h-12 font-bold rounded-xl", isSealed ? "bg-emerald-600" : "bg-sky-600 shadow-glow")}
                >
                  {isSealed ? <><Lock className="mr-2 size-4" /> RECORD LOCKED & SIGNED</> : "LOCK ANALYSIS & SIGN RECORD"}
                </Button>
              </CardContent>
            </Card>
            <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-sm relative overflow-hidden">
               <div className="flex items-center gap-2 mb-3 text-slate-500">
                <EyeOff className="size-3" />
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest">Auto-Redaction Preview</span>
              </div>
              <p className="text-[11px] font-mono leading-relaxed bg-black/40 p-4 rounded-xl text-slate-400 border border-slate-800/50">
                {scrubbedNarrative}
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Calculator className="text-indigo-400 size-8" />
              {isExpertMode ? "Forensic Findings" : "Results"}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative group">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Regional Fair Price</p>
                <p className="text-3xl font-bold font-mono text-emerald-400 mt-1">${(marketEntry.fmv / 100).toFixed(2)}</p>
                <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
                  <ShieldHalf className="size-3" /> Verified Baseline
                </p>
              </Card>
              <Card className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative group">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Audit Score</p>
                <p className={cn(
                  "text-3xl font-bold font-mono mt-1",
                  variance.status === 'critical' ? "text-rose-500" : "text-emerald-500"
                )}>
                  {variance.status === 'nominal' ? "PASS" : "RISK"}
                </p>
                <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-tighter">
                  {variance.percent.toFixed(0)}% Price Difference
                </p>
              </Card>
            </div>
            {isSealed ? (
              <SmartNarrative record={{ variance, cptCode }} />
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-800 rounded-3xl text-center space-y-4">
                <Sparkles className="size-8 text-slate-700 mx-auto" />
                <p className="text-slate-500 text-sm italic">Lock the record to see full advice and generate your forensic audit hash.</p>
              </div>
            )}
            <Card className="bg-slate-900 border-slate-800 rounded-3xl shadow-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="size-4 text-sky-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Digital Integrity Fingerprint</h4>
              </div>
              <div className="bg-black/50 p-4 rounded-xl border border-slate-800/50 font-mono text-[10px] text-sky-500/70 break-all">
                {recordHash}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}