import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { History, FileText, CheckCircle2, TrendingDown, ExternalLink, ShieldAlert, Plus, Trash2, RefreshCcw } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AppealLog } from '@shared/types';
export function AppealsTrackerPage() {
  const [appeals, setAppeals] = useState<AppealLog[]>([]);
  const loadHistory = useCallback(() => {
    const history = sessionStorage.getItem('fairmed_appeals_history');
    if (history) {
      try {
        setAppeals(JSON.parse(history));
      } catch (e) {
        console.error('Failed to parse history');
      }
    } else {
      setAppeals([]);
    }
  }, []);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);
  const updateStatus = (id: string, reduction: string) => {
    const updated = appeals.map(a =>
      a.id === id ? { ...a, status: 'Resolved' as const, resolutionAmount: parseFloat(reduction) } : a
    );
    setAppeals(updated);
    sessionStorage.setItem('fairmed_appeals_history', JSON.stringify(updated));
    toast.success('Appeal resolution logged!');
  };
  const clearHistory = () => {
    sessionStorage.removeItem('fairmed_appeals_history');
    setAppeals([]);
    toast.success('Session history cleared for privacy');
  };
  const totalSaved = appeals.reduce((acc, curr) => acc + (curr.resolutionAmount || 0), 0);
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold flex items-center gap-3">
              <History className="h-8 w-8 text-primary" /> My Appeal Tracker
            </h1>
            <p className="text-muted-foreground">Managing your healthcare cost reduction journey. Private, session-based storage.</p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="xs" className="h-7 text-[10px] uppercase font-bold" onClick={loadHistory}>
                <RefreshCcw className="h-3 w-3 mr-1" /> Refresh Session
              </Button>
              {appeals.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="xs" className="h-7 text-[10px] uppercase font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-3 w-3 mr-1" /> Privacy Reset
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Local History?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all tracked appeals from your current browser session. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearHistory} className="bg-rose-500 hover:bg-rose-600">
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <Card className="bg-emerald-50 border-emerald-200 p-4">
              <div className="text-xs text-emerald-700 font-bold uppercase">Total Saved</div>
              <div className="text-2xl font-display font-bold text-emerald-900">${totalSaved.toFixed(2)}</div>
            </Card>
            <Card className="bg-primary/5 p-4">
              <div className="text-xs text-muted-foreground font-bold uppercase">Active Disputes</div>
              <div className="text-2xl font-display font-bold">{appeals.filter(a => a.status !== 'Resolved').length}</div>
            </Card>
          </div>
        </div>
        {appeals.length === 0 ? (
          <div className="h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-12 bg-muted/10">
            <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold">No Appeals Logged</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Run a forensic audit on a medical bill to generate a dispute letter and track its progress here.
            </p>
            <Button asChild className="mt-8 rounded-full px-8">
              <Link to="/audit"><Plus className="mr-2 h-4 w-4" /> Start First Audit</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {appeals.map((appeal) => (
              <Card key={appeal.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 md:w-1/4 bg-muted/30 border-r flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Generated On</div>
                      <div className="font-medium text-sm">{new Date(appeal.timestamp).toLocaleDateString()}</div>
                    </div>
                    <Badge className={cn(
                      "mt-4 w-fit",
                      appeal.status === 'Resolved' ? "bg-emerald-500" : "bg-primary"
                    )}>
                      {appeal.status}
                    </Badge>
                  </div>
                  <CardContent className="p-6 flex-1">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-lg">CPT Code {appeal.cptCode}</div>
                            <div className="text-sm text-muted-foreground">Original Bill: ${appeal.billedAmount.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                          <TrendingDown className="h-4 w-4" /> Potential Savings: ${appeal.projectedSavings.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex flex-col justify-end items-end gap-3 min-w-[200px]">
                        {appeal.status !== 'Resolved' ? (
                          <div className="w-full space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Logged a reduction?</label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="Final Saved $"
                                className="h-9 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') updateStatus(appeal.id, (e.target as HTMLInputElement).value);
                                }}
                              />
                              <Button size="sm" onClick={(e) => {
                                const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                if (input.value) updateStatus(appeal.id, input.value);
                              }}>Log</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase text-emerald-600">Final Outcome</div>
                            <div className="text-2xl font-display font-bold text-emerald-700">+${appeal.resolutionAmount?.toFixed(2)}</div>
                          </div>
                        )}
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="mr-2 h-4 w-4" /> View Draft
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}