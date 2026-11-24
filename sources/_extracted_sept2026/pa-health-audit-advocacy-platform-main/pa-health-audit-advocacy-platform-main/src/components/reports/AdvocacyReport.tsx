import React, { forwardRef } from 'react';
import { ShieldCheck, FileText, Calendar, Scale } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
interface AdvocacyReportProps {
  data: any;
  title?: string;
  type?: 'Subsidy' | 'EOB' | 'RatingArea';
}
export const AdvocacyReport = forwardRef<HTMLDivElement, AdvocacyReportProps>(({ data = {}, title, type = 'Subsidy' }, ref) => {
  const timestamp = new Date().toLocaleString();
  const reportId = Math.random().toString(36).substring(7).toUpperCase();
  const formatCurrency = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? '$0.00' : num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };
  return (
    <div
      ref={ref}
      className="hidden print:block bg-white text-slate-950 p-12 min-h-[11in] w-[8.5in] font-sans selection:bg-transparent relative"
    >
      {/* Institutional Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none rotate-45 text-8xl font-black text-slate-900 text-center">
        PA HEALTH AUDIT<br/>OFFICIAL RECORD
      </div>
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-10 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-blue-700 font-black text-3xl uppercase tracking-tighter">
            <ShieldCheck className="h-10 w-10" />
            PA Health Audit Platform
          </div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Forensic Adjudication</p>
        </div>
        <div className="text-right text-[8pt] font-mono text-slate-400 space-y-1">
          <div className="flex items-center justify-end gap-1">
            <Calendar className="h-3 w-3" /> {timestamp}
          </div>
          <div className="font-bold text-slate-900">REPORT ID: {reportId}</div>
          <div className="uppercase tracking-widest">Status: Validated</div>
        </div>
      </div>
      {/* Content Section */}
      <section className="space-y-10 relative z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-[18pt] font-black uppercase flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            {title || 'Case Analysis Summary'}
          </h2>
          <Badge variant="outline" className="border-2 font-black px-4 py-1 uppercase text-xs">Priority: Internal</Badge>
        </div>
        <div className="bg-slate-50 border-2 border-slate-200 p-8 rounded-2xl leading-relaxed text-slate-800 text-[11pt] shadow-sm italic">
          "This document is an institutional forensic record generated for health insurance advocacy purposes. 
          The data cross-references 2026 market volatility multipliers with official PA Rating Area benchmarks."
        </div>
        {/* Data Grid with avoid-break */}
        <div className="grid grid-cols-2 gap-6 page-break-inside-avoid">
           <div className="p-6 border-2 border-slate-100 rounded-2xl bg-white shadow-sm">
              <p className="text-[9pt] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Subject</p>
              <p className="text-[14pt] font-bold text-slate-900">{type === 'Subsidy' ? 'Household Subsidy Evaluation' : 'Claim Forensic Audit'}</p>
           </div>
           <div className="p-6 border-2 border-slate-100 rounded-2xl bg-white shadow-sm">
              <p className="text-[9pt] font-black text-slate-400 uppercase tracking-widest mb-1">Forensic Status</p>
              <p className="text-[14pt] font-bold text-blue-600">Active Adjudication</p>
           </div>
        </div>
        {/* Dynamic Section for Subsidy */}
        {type === 'Subsidy' && (
          <div className="space-y-6 page-break-inside-avoid">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border-2 rounded-xl text-center">
                <p className="text-[8pt] font-black text-slate-400 uppercase">FPL Factor</p>
                <p className="text-[16pt] font-black">{data?.fplPercentage}%</p>
              </div>
              <div className="p-4 border-2 rounded-xl text-center">
                <p className="text-[8pt] font-black text-slate-400 uppercase">Eligibility</p>
                <p className="text-[16pt] font-black">{data?.eligibility}</p>
              </div>
              <div className="p-4 border-2 rounded-xl text-center">
                <p className="text-[8pt] font-black text-slate-400 uppercase">Net Cost</p>
                <p className="text-[16pt] font-black text-blue-600">{formatCurrency(data?.netPremium)}</p>
              </div>
            </div>
          </div>
        )}
        {/* Strategic Protocols */}
        <div className="pt-10 border-t-2 border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <Scale className="h-5 w-5 text-blue-700" />
            <h3 className="font-black text-[12pt] uppercase tracking-[0.1em] text-blue-900">Institutional Strategic Directives</h3>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="p-6 bg-slate-50 border-l-4 border-blue-600 rounded-r-2xl">
              <p className="font-black text-[10pt] text-slate-900 uppercase mb-2">Act 68 Compliance</p>
              <p className="text-[9pt] text-slate-600 leading-relaxed font-medium">
                Mandatory document retention for external grievance procedures. Review carrier adjudication against regional clinical standards.
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-l-4 border-slate-900 rounded-r-2xl">
              <p className="font-black text-[10pt] text-slate-900 uppercase mb-2">ARPA Cliff Mitigation</p>
              <p className="text-[9pt] text-slate-600 leading-relaxed font-medium">
                Monitor household income limits ($60,240/Individual) to mitigate 2026 premium cliff exposure during transition.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Footer / Signature */}
      <div className="mt-auto pt-16 relative z-10">
        <div className="grid grid-cols-2 gap-20">
          <div className="space-y-4">
            <div className="border-b-2 border-slate-900 h-10 w-full" />
            <p className="text-[8pt] font-black uppercase text-slate-400">Authorized Advocate Signature</p>
          </div>
          <div className="space-y-4">
            <div className="border-b-2 border-slate-200 h-10 w-full flex items-end">
              <span className="text-[8pt] font-mono text-slate-400 mb-1">{reportId}-SECURE</span>
            </div>
            <p className="text-[8pt] font-black uppercase text-slate-400">Digital Validation Stamp</p>
          </div>
        </div>
        <p className="text-center text-[7pt] text-slate-400 mt-12 font-medium tracking-widest uppercase">
          Forensic Adjudication Request | Generated via PA Health Audit & Advocacy Platform v2026
        </p>
      </div>
    </div>
  );
});
AdvocacyReport.displayName = "AdvocacyReport";