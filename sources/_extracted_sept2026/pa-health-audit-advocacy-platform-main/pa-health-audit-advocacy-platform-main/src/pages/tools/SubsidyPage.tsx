import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SubsidyCalculator, SubsidyResult } from "@/lib/calculations";
import { calculateNetPremiumImpact, NetPremiumImpact } from "@/lib/subsidyLogic";
import { subsidyFormSchema, SubsidyFormValues } from "@/lib/validationSchemas";
import { Badge } from "@/components/ui/badge";
import { Calculator, Loader2, Share2 } from "lucide-react";
import { SubsidyCliffChart } from "@/components/SubsidyCliffChart";
import { SubsidyEmergencyAlert } from "@/components/alerts/SubsidyEmergencyAlert";
import { generateShareLink, copyToClipboard, parseShareLink } from "@/lib/shareUtils";
import { useAudit } from "@/hooks/useAudit";
import { toast } from "sonner";
import { PDFGeneratorUI } from "@/components/PDFGeneratorUI";
import { ReportJSON, PdfBlock } from "@/lib/types";
export default function SubsidyPage() {
  const { state, updateState } = useAudit();
  const [result, setResult] = useState<SubsidyResult | null>(state.lastSubsidyResult);
  const [impact, setImpact] = useState<NetPremiumImpact | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const form = useForm<SubsidyFormValues>({
    resolver: zodResolver(subsidyFormSchema),
    defaultValues: {
      income: state.income || 45000,
      household: state.household || 1
    }
  });
  const watchedIncome = form.watch("income");
  const watchedHousehold = form.watch("household");
  useEffect(() => {
    const shared = parseShareLink<SubsidyFormValues>();
    if (shared) {
      form.reset(shared);
      toast.info("Collaborative subsidy state loaded");
    }
  }, [form]);
  const onSubmit: SubmitHandler<SubsidyFormValues> = useCallback(async (values) => {
    setIsCalculating(true);
    updateState({ income: values.income, household: values.household });
    try {
      await new Promise(r => setTimeout(r, 600));
      const calc = await SubsidyCalculator.safeCalculateSubsidy(values.income, values.household);
      setResult(calc);
      if (calc) {
        const impactCalc = calculateNetPremiumImpact(calc.marketPremium, values.income);
        setImpact(impactCalc);
        updateState({ lastSubsidyResult: calc });
      }
    } finally {
      setIsCalculating(false);
    }
  }, [updateState]);
  const reportJson: ReportJSON = useMemo(() => {
    const formatCurr = (v: number) => `${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const blocks: PdfBlock[] = [
      { text: "OFFICIAL HOUSEHOLD ASSESSMENT", x: 50, y: 80, size: 18, bold: true },
      { text: "Institutional Analysis of 2026 Premium Volatility", x: 50, y: 105, size: 10, color: [100, 100, 100] },
      { text: "INPUT PARAMETERS", x: 50, y: 150, size: 12, bold: true },
      { text: `Adjusted Gross Income: ${formatCurr(watchedIncome)}`, x: 50, y: 175, size: 11 },
      { text: `Household Size: ${watchedHousehold}`, x: 50, y: 195, size: 11 },
      { text: "FORENSIC FINDINGS", x: 50, y: 240, size: 12, bold: true },
      { text: `FPL Multiplier: ${result?.fplPercentage ?? 0}%`, x: 50, y: 265, size: 11 },
      { text: `Net Monthly Premium: ${formatCurr(impact?.netPremium ?? 0)}`, x: 50, y: 305, size: 13, bold: true },
      { text: "CLIFF RISK EVALUATION", x: 50, y: 350, size: 12, bold: true },
      { text: `Status: ${impact?.cliffRisk?.toUpperCase() || "UNAUDITED"}`, x: 50, y: 375, size: 11, bold: true, color: impact?.isAboveCliff ? [220, 38, 38] : [15, 23, 42] },
      { text: result?.warning || "No warnings detected for current income tier.", x: 50, y: 400, size: 10, maxWidth: 500 },
      { text: "DISCLAIMER: Non-evaluative data provided per Q3 2025 regulatory filings.", x: 50, y: 780, size: 8, italic: true, color: [150, 150, 150] }
    ];
    return {
      metadata: {
        title: "2026 Subsidy Forensic Audit",
        author: "PA Health Platform",
        subject: "Subsidy Evaluation",
        reportId: `SUB-${Date.now()}`,
        timestamp: new Date().toISOString()
      },
      blocks
    };
  }, [result, impact, watchedIncome, watchedHousehold]);
  return (
    <AppLayout container>
      <div className="max-w-5xl mx-auto space-y-8">
        <SubsidyEmergencyAlert />
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black flex items-center gap-2">
              <Calculator className="text-blue-600" /> Subsidy Audit
            </h1>
            <p className="text-muted-foreground italic">ARPA caps vs 2026 Market Cliff modeling.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateShareLink(form.getValues()))} className="font-bold">
              <Share2 className="h-4 w-4 mr-2" /> Share Result
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="border-2">
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Household Data Capture</CardTitle></CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="income" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Projected 2026 Income ($)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-12 border-2 text-lg font-black" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="household" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Family Size</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-12 border-2 text-lg font-black" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full h-12 font-black text-lg bg-blue-600" disabled={isCalculating}>
                      {isCalculating ? <Loader2 className="animate-spin" /> : "EXECUTE AUDIT"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            {result && (
              <PDFGeneratorUI 
                reportData={reportJson} 
                fileName={`Subsidy-Audit-${watchedIncome}.pdf`} 
              />
            )}
          </div>
          <div className="space-y-6">
            {result ? (
              <div className="space-y-6 animate-fade-in">
                <Card className={`border-2 ${result.status === 'Cliff' ? 'border-red-500 bg-red-50/10' : 'border-blue-500 bg-blue-50/10'}`}>
                  <CardHeader><CardTitle className="flex justify-between items-center text-sm font-black uppercase">
                    Audit Output {result.status === 'Cliff' && <Badge variant="destructive">CLIFF DETECTED</Badge>}
                  </CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white border-2 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">FPL Factor</p>
                        <p className="text-2xl font-black">{result.fplPercentage}%</p>
                      </div>
                      <div className="p-4 bg-white border-2 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Risk Rating</p>
                        <p className={`text-2xl font-black ${impact?.cliffRisk === 'Critical' ? 'text-red-600' : 'text-blue-600'}`}>{impact?.cliffRisk}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <SubsidyCliffChart benchmarkPremium={result.marketPremium} householdSize={watchedHousehold} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 border-4 border-dashed rounded-3xl opacity-20">
                <Calculator className="h-16 w-16 mb-4" />
                <p className="font-black uppercase tracking-tighter">Awaiting Household Input</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}