import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Book, HelpCircle, ExternalLink, Zap } from "lucide-react";
import { CPT_GLOSSARY } from "@/lib/forensic-core";
const TERMS = [
  { term: "Variance", def: "The difference between what you were billed and what the local market usually charges.", eli12: "The extra money the doctor asked for that most others don't." },
  { term: "FMV (Fair Market Value)", def: "The reasonable price for a medical service in your specific county.", eli12: "The 'fair price' everyone agrees is honest." },
  { term: "Digital Seal", def: "A cryptographic proof that your bill data hasn't been changed by anyone.", eli12: "A magic lock that proves no one messed with your papers." },
  { term: "Upcoding", def: "A billing error where a more expensive service is listed than what was provided.", eli12: "Like being charged for a giant pizza when you only got a slice." },
];
export function GlossarySheet({ children }: { children?: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const filteredCpt = Object.entries(CPT_GLOSSARY).filter(([code, data]) => 
    code.includes(search) || data.label.toLowerCase().includes(search.toLowerCase())
  );
  const filteredTerms = TERMS.filter(t => 
    t.term.toLowerCase().includes(search.toLowerCase()) || t.def.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <button className="flex items-center gap-2 text-slate-500 hover:text-sky-400 transition-colors">
            <HelpCircle className="size-4" />
            <span className="text-xs font-medium">Quick Glossary</span>
          </button>
        )}
      </SheetTrigger>
      <SheetContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-md">
        <SheetHeader className="text-left mt-4">
          <div className="flex items-center gap-2 text-sky-400 mb-1">
            <Book className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Medical Rights Dictionary</span>
          </div>
          <SheetTitle className="text-2xl font-bold">Search Terms</SheetTitle>
          <SheetDescription className="text-slate-400 text-xs">
            Look up medical codes or forensic auditing terms in plain English.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <Input 
            placeholder="Search codes or terms..." 
            className="pl-10 bg-slate-900 border-slate-800 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[calc(100vh-250px)] mt-6 pr-4">
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-900 pb-2">Forensic Terms</h3>
              {filteredTerms.map(t => (
                <div key={t.term} className="space-y-2 group">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sky-400">{t.term}</h4>
                    <span className="text-[9px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/20 font-mono">DEFINITION</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{t.def}</p>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                    <p className="text-[11px] text-slate-400 italic">
                      <span className="text-amber-400 not-italic font-bold">ELI12:</span> {t.eli12}
                    </p>
                  </div>
                </div>
              ))}
            </section>
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-900 pb-2">Medical Codes (CPT)</h3>
              {filteredCpt.map(([code, data]) => (
                <div key={code} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white">Code {code}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{data.typicalPrice} Avg</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{data.label}</p>
                  <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                    <p className="text-[11px] text-slate-300">
                       {data.eli12}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </ScrollArea>
        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center gap-3">
            <Zap className="size-4 text-sky-400" />
            <p className="text-[10px] text-sky-400 leading-tight">
              Can't find a code? Use the <strong>Bill Checker</strong> to analyze any claim in real-time.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}