import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FORENSIC_MARKET_BRIEF } from '@/lib/briefContent';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Info, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
export function ForensicBrief() {
  return (
    <div className="space-y-6">
      <div className="max-w-none text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-3xl font-black tracking-tighter mb-6 text-foreground">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold text-blue-700 mt-8 mb-4">{children}</h2>,
            p: ({ children }) => <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>,
            ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-1">{children}</ul>,
            li: ({ children }) => <li className="text-muted-foreground text-sm">{children}</li>,
            strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
          }}
        >
          {FORENSIC_MARKET_BRIEF}
        </ReactMarkdown>
      </div>
      <div className="bg-slate-900 text-white rounded-xl p-6 border-l-4 border-blue-500 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-400" />
            <p className="text-sm font-black uppercase tracking-widest">Forensic Action Item</p>
          </div>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            The Ambetter 37.8% outlier creates significant cost exposure. Use the <span className="text-white font-bold">EOB Auditor</span> to rehydrate 2025 historical data with current forensic multipliers.
          </p>
        </div>
        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold shrink-0">
          <Link to="/tools/audit">Audit 2026 Costs</Link>
        </Button>
      </div>
      <Alert className="bg-blue-50 border-blue-200 mt-8">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-xs font-black uppercase text-blue-800">Market Advisory</AlertTitle>
        <AlertDescription className="text-xs text-blue-700 leading-relaxed">
          The data above is cross-referenced with PA Insurance Department filings as of Q3 2025. Projections are forensic and non-evaluative.
        </AlertDescription>
      </Alert>
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black uppercase text-red-800">Critical Outlier Warning</p>
          <p className="text-xs text-red-700 leading-tight italic">
            Ambetter's 37.8% spike creates a high risk of benchmark "Silver Loading" errors. Forensic cost rehydration is mandatory for accurate 2026 budgeting.
          </p>
        </div>
      </div>
    </div>
  );
}