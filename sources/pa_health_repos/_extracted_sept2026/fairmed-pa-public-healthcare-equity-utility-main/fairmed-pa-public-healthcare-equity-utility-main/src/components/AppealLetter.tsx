import React from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import type { AppealDraft, AppealLog } from '@shared/types';
interface AppealLetterProps {
  draft: AppealDraft;
  cpt?: string;
  amount?: number;
  savings?: number;
}
export function AppealLetter({ draft, cpt, amount, savings }: AppealLetterProps) {
  const [copied, setCopied] = React.useState(false);
  const [searchParams] = useSearchParams();
  const logAppeal = React.useCallback(() => {
    const history: AppealLog[] = JSON.parse(sessionStorage.getItem('fairmed_appeals_history') || '[]');
    const finalCpt = cpt || searchParams.get('cpt') || 'Unknown';
    const finalAmount = amount || 0;
    const finalSavings = savings || 0;
    const newLog: AppealLog = {
      id: Math.random().toString(36).slice(2, 11),
      timestamp: new Date().toISOString(),
      cptCode: finalCpt,
      billedAmount: finalAmount,
      projectedSavings: finalSavings,
      status: 'Generated'
    };
    // Prevent duplicates: same CPT and Amount within the last 5 minutes
    const isDuplicate = history.some(h => 
      h.cptCode === newLog.cptCode && 
      h.billedAmount === newLog.billedAmount &&
      (new Date().getTime() - new Date(h.timestamp).getTime()) < 300000
    );
    if (!isDuplicate) {
      sessionStorage.setItem('fairmed_appeals_history', JSON.stringify([newLog, ...history]));
    }
  }, [cpt, amount, savings, searchParams]);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    toast.success('Letter copied to clipboard');
    logAppeal();
    setTimeout(() => setCopied(false), 2000);
  };
  const downloadText = () => {
    const finalCpt = cpt || searchParams.get('cpt') || 'Generic';
    const element = document.createElement('a');
    const file = new Blob([`${draft.subject}\n\n${draft.body}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `appeal_cpt_${finalCpt.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    logAppeal();
    toast.success('Downloading letter...');
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Generated Appeal Draft</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={downloadText}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[300px] w-full border rounded-xl bg-white p-6 font-mono text-sm leading-relaxed text-slate-800 shadow-inner dark:text-slate-200 dark:bg-slate-900">
        <div className="space-y-6">
          <div className="border-b pb-4">
            <span className="font-bold">Subject:</span> {draft.subject}
          </div>
          <div className="whitespace-pre-wrap">
            {draft.body}
          </div>
        </div>
      </ScrollArea>
      <p className="text-[10px] text-muted-foreground italic">
        * Pro-tip: Send this as a certified letter or through your insurance provider's secure messaging portal for best results.
      </p>
    </div>
  );
}