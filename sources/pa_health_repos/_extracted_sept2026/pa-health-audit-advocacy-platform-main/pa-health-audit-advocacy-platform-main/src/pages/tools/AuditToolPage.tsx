import React, { useState, useCallback, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { safeAuditEob, AuditResult } from "@/lib/eobCalculations";
import { eobFormSchema, EobFormValues } from "@/lib/validationSchemas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, FileSearch, Loader2, Info, Printer, Activity, History } from "lucide-react";
import { AdvocacyReport } from "@/components/reports/AdvocacyReport";
import { ForecastAlert } from "@/components/alerts/ForecastAlert";
import { usePrintReport } from "@/hooks/usePrintReport";
import { useAudit } from "@/hooks/useAudit";
import { ResilienceGauge } from "@/components/ResilienceGauge";
import { RATING_AREAS } from "@/data/ratingAreas";
import { toast } from "sonner";
export default function AuditToolPage() {
  const { state, updateState } = useAudit();
  const [result, setResult] = useState<AuditResult | null>(state.lastEobResult);
  const [isAuditing, setIsAuditing] = useState(false);
  const printId = useMemo(() => `EOB-Audit-${new Date().getTime()}`, []);
  const { componentRef, handlePrint } = usePrintReport(printId);
  const form = useForm<EobFormValues>({
    resolver: zodResolver(eobFormSchema),
    defaultValues: {
      billed: 0,
      allowed: 0,
      paid: 0,
      coinsurance: 20,
      procedureCode: "99213",
      facilityName: "",
      ratingArea: "1",
      historicalAllowed: 0,
      carrierName: ""
    }
  });
  const selectedAreaId = form.watch("ratingArea");
  const carriersForArea = useMemo(() => {
    const area = RATING_AREAS.find(a => a.id === selectedAreaId);
    return area?.carriers || [];
  }, [selectedAreaId]);
  const onSubmit: SubmitHandler<EobFormValues> = useCallback(async (values) => {
    setIsAuditing(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      const auditResult = await safeAuditEob(values);
      if (auditResult) {
        setResult(auditResult);
        updateState({ lastEobResult: auditResult });
        if (auditResult.isHighRisk) {
          toast.warning("High Risk Discrepancy Detected");
        } else {
          toast.success("Audit Complete");
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred during auditing.");
    } finally {
      setIsAuditing(false);
    }
  }, [updateState]);
  return (
    <AppLayout container>
      <AdvocacyReport ref={componentRef} data={{ ...result, ...form.getValues() }} type="EOB" title="EOB Forensic Audit" />
      <div className="space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-black flex items-center gap-2">
              <FileSearch className="text-blue-600" /> EOB Forensic Auditor
            </h1>
            <p className="text-muted-foreground">Identify billing errors and forecast 2026 medical costs via forensic rehydration.</p>
          </div>
          {result && (
            <Button variant="outline" onClick={() => handlePrint()} className="font-black gap-2">
              <Printer className="h-4 w-4" /> Export Report
            </Button>
          )}
        </header>
        <Alert className="bg-amber-50 border-amber-200">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-xs font-black uppercase text-amber-800 tracking-wider">Forensic Disclaimer</AlertTitle>
          <AlertDescription className="text-xs text-amber-700">
            Audit calculations and 2026 projections are non-evaluative and based on Q3 2025 regulatory filings. Results do not constitute legal advice.
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-widest">Data Capture</CardTitle></CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="ratingArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase">Rating Area Selection</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Rating Area" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RATING_AREAS.map((area) => (
                                <SelectItem key={area.id} value={area.id}>
                                  Area {area.id}: {area.name.split('(')[1]?.replace(')', '') || area.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="rehydration" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex items-center gap-2 text-blue-600">
                            <History className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">2026 Cost Rehydration</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="carrierName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold">Specific Carrier (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || "none"}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Use Area Average" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">Use Area Average</SelectItem>
                                    {carriersForArea.map((c) => (
                                      <SelectItem key={c.name} value={c.name}>
                                        {c.name} ({c.approvedIncrease}% shift)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription className="text-[10px]">Target specific volatility multipliers.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="historicalAllowed"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold">2025 Historical Allowed ($)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="procedureCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">CPT Code</FormLabel>
                            <FormControl><Input {...field} placeholder="99213" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="coinsurance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Coinsurance %</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name="billed"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Billed ($)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="allowed"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Allowed ($)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Paid ($)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full font-bold bg-blue-600 hover:bg-blue-700" disabled={isAuditing}>
                      {isAuditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Execute Forensic Audit"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-7 space-y-6">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl text-muted-foreground bg-slate-50/50">
                <Activity className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">Awaiting Forensic Input</p>
                <p className="text-xs mt-1">Submit claim data to generate resilience scoring and cost forecasts.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 animate-fade-in">
                {result.isForecastMode && typeof result.forecasted2026Allowed === 'number' && (
                  <ForecastAlert
                    amount={result.forecasted2026Allowed}
                    multiplier={result.activeMultiplier || 1.215}
                    carrierName={form.getValues("carrierName")}
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className={`border-2 ${result.isResilient ? "border-emerald-500" : "border-red-500"}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Market Resilience</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-4">
                      <ResilienceGauge score={result.resilienceScore} />
                    </CardContent>
                  </Card>
                  <Card className={result.isPotentialError ? "border-red-500 bg-red-50/20" : "border-slate-200"}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Audit Findings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm font-bold">Balance Billing:</span>
                        <span className={`text-2xl font-black ${result.balanceBilling > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          ${result.balanceBilling.toFixed(2)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400">Forensic Notes</p>
                        {result.forensicNotes.map((note, idx) => (
                          <div key={idx} className="flex gap-2 text-[10px] text-slate-700 font-medium">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-1" />
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}