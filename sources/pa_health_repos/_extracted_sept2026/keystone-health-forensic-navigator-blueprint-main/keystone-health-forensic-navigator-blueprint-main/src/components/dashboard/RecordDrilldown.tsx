import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ShieldAlert,
  Stethoscope,
  Building2,
  Fingerprint,
  CalendarDays,
  ArrowRight,
  Info,
  ChevronRight,
  FileText,
  Copy,
  CheckCircle2
} from "lucide-react";
import type { ForensicRecord } from "@shared/types";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { CPT_GLOSSARY } from "@/lib/forensic-core";
export function RecordDrilldown({ record }: { record: ForensicRecord }) {
  const navigate = useNavigate();
  const billedVal = (record.billedCents / 100).toFixed(2);
  const fmvVal = (record.marketBaseline.fmv / 100).toFixed(2);
  const glossaryTip = CPT_GLOSSARY[record.cptCode] || {
    label: "Unknown Procedure",
    description: "Details for this code are currently being processed in the state registry.",
    typicalPrice: "N/A",
    eli12: "a doctor visit"
  };
  const copyHash = () => {
    navigator.clipboard.writeText(record.recordHash);
    toast.success("Hash Copied", { description: "Cryptographic signature saved to clipboard." });
  };
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="text-left w-full group focus-visible:outline-none">
          <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-sky-500/50 transition-all duration-300 hover:bg-slate-900/60 shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <Badge variant="outline" className="font-mono text-[9px] border-slate-700 text-slate-400 px-1.5 py-0">
                CODE {record.cptCode}
              </Badge>
              <div className={cn(
                "h-2 w-2 rounded-full",
                record.variance.status === 'critical' ? "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-emerald-500"
              )} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{glossaryTip.label}</p>
              <p className={cn(
                "text-2xl font-bold font-mono tracking-tight",
                record.variance.status === 'critical' ? "text-rose-400" : "text-sky-400"
              )}>
                {record.variance.percent > 0 ? "+" : ""}{record.variance.percent.toFixed(0)}%
              </p>
              <p className="text-[10px] text-slate-600 font-medium">vs. Regional Baseline</p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-medium border-t border-slate-800/50 pt-3">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="size-3 text-slate-500" />
                {record.providerSpecialty ?? "General"}
              </span>
              <span className="group-hover:text-sky-400 flex items-center gap-0.5 transition-colors">
                Audit Details <ChevronRight className="size-3" />
              </span>
            </div>
          </div>
        </button>
      </SheetTrigger>
      <SheetContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-md p-0">
        <ScrollArea className="h-full">
          <div className="px-6 py-8 space-y-8">
            <SheetHeader className="text-left space-y-2">
              <div className="flex items-center gap-2 text-sky-400">
                <ShieldAlert className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Patient Advocate Drilldown</span>
              </div>
              <SheetTitle className="text-2xl font-bold tracking-tight text-white">
                Visit Analysis
              </SheetTitle>
              <SheetDescription className="text-slate-400 text-xs flex items-center gap-2">
                <CalendarDays className="size-3" /> Reviewed {new Date(record.timestamp).toLocaleDateString()}
              </SheetDescription>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner group">
                <span className="text-[10px] text-slate-500 uppercase font-bold group-hover:text-slate-400 transition-colors">You Were Billed</span>
                <p className="text-2xl font-bold font-mono text-white tracking-tighter">${billedVal}</p>
              </div>
              <div className="space-y-1 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner group">
                <span className="text-[10px] text-slate-500 uppercase font-bold group-hover:text-slate-400 transition-colors">Fair Market Value</span>
                <p className="text-2xl font-bold font-mono text-emerald-400 tracking-tighter">${fmvVal}</p>
              </div>
            </div>
            <div className="space-y-3 bg-sky-500/5 p-5 rounded-2xl border border-sky-500/10">
              <div className="flex items-center gap-2 mb-1">
                <Info className="size-4 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-sky-400">Why This Matters</h4>
              </div>
              <p className="text-xs text-sky-100/70 leading-relaxed">
                This was {glossaryTip.eli12}. Usually, this costs around <strong>{glossaryTip.typicalPrice}</strong> in your county. 
                The {record.variance.percent.toFixed(0)}% difference found here suggests a higher-than-normal billing tier.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-900 pb-1">Contextual Data</h4>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Stethoscope className="size-3" /> Specialty
                  </div>
                  <span className="text-xs text-white font-medium">{record.providerSpecialty ?? "General"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Building2 className="size-3" /> Care Setting
                  </div>
                  <span className="text-xs text-white font-medium">{record.placeOfService ?? "Office"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <FileText className="size-3" /> Carrier Baseline
                  </div>
                  <span className="text-xs text-white font-medium">{record.marketBaseline.carrier}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Service Description</h4>
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs leading-relaxed text-slate-300">
                {glossaryTip.description}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-slate-500">
                  <Fingerprint className="size-4" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Audit Hash (LMP-256)</h4>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-600 hover:text-sky-400" onClick={copyHash}>
                  <Copy className="size-3" />
                </Button>
              </div>
              <div className="p-3 bg-black/50 rounded-xl border border-slate-900 font-mono text-[9px] break-all leading-tight text-slate-600 select-all cursor-pointer hover:text-slate-400 transition-colors" onClick={copyHash}>
                {record.recordHash}
              </div>
            </div>
            <div className="pt-4 flex flex-col gap-3 pb-8">
              <Button
                className="btn-gradient w-full font-bold h-12 rounded-xl"
                onClick={() => navigate('/audit')}
              >
                RUN NEW COMPARISON
                <ArrowRight className="ml-2 size-4" />
              </Button>
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
                <CheckCircle2 className="size-3 text-emerald-500" />
                Verified by Keystone Forensic Protocol
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}