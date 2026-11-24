import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileText, Copy, Check, ShieldCheck, Share2 } from "lucide-react";
import { generateAppealStrategy } from "@/lib/appealLogic";
import { generateShareLink, copyToClipboard, parseShareLink } from "@/lib/shareUtils";
import { TemplateSelector } from "@/components/advocacy/AppealTemplates";
import { TemplateType, ADVOCACY_TEMPLATES } from "@/components/advocacy/AppealTemplatesData";
import { toast } from "sonner";
import { appealFormSchema, AppealFormValues } from "@/lib/validationSchemas";
import { PDFGeneratorUI } from "@/components/PDFGeneratorUI";
import { ReportJSON, PdfBlock } from "@/lib/types";
export default function AppealPage() {
  const [copied, setCopied] = useState(false);
  const [template, setTemplate] = useState<TemplateType>('MEDICAL_NECESSITY');
  const form = useForm<AppealFormValues>({
    resolver: zodResolver(appealFormSchema),
    defaultValues: {
      userName: "Pennsylvania Resident",
      denialCode: "MED_NEC",
      facilityName: ""
    }
  });
  useEffect(() => {
    const shared = parseShareLink<AppealFormValues & { template: TemplateType }>();
    if (shared) {
      form.reset({
        userName: shared.userName,
        denialCode: shared.denialCode,
        facilityName: shared.facilityName
      });
      if (shared.template) setTemplate(shared.template);
      toast.info("Shared appeal state loaded");
    }
  }, [form]);
  const watchedValues = form.watch();
  const strategy = useMemo(() => 
    generateAppealStrategy(template === 'MEDICAL_NECESSITY' ? 'MED_NEC' : template, watchedValues.userName, watchedValues.facilityName),
    [template, watchedValues.userName, watchedValues.facilityName]
  );
  const reportJson: ReportJSON = useMemo(() => {
    const blocks: PdfBlock[] = [
      { text: "CONFIDENTIAL CLINICAL RECORD", x: 450, y: 40, size: 8, bold: true, color: [220, 38, 38] },
      { text: "OFFICIAL NOTICE OF GRIEVANCE", x: 50, y: 80, size: 22, bold: true },
      { text: `Institutional Strategy: ${ADVOCACY_TEMPLATES[template].title}`, x: 50, y: 110, size: 10, color: [100, 100, 100] },
      { text: strategy.text, x: 50, y: 160, size: 12, maxWidth: 500, lineHeight: 16 },
      { text: "ATTESTATION OF ACCURACY", x: 50, y: 680, size: 10, bold: true },
      { text: `Signatory: ${watchedValues.userName}`, x: 50, y: 700, size: 11, bold: true },
      { text: `Date of Generation: ${new Date().toLocaleDateString()}`, x: 50, y: 720, size: 10 }
    ];
    return {
      metadata: {
        title: `OFFICIAL NOTICE OF GRIEVANCE`,
        author: watchedValues.userName,
        subject: "Health Insurance Appeal",
        reportId: `APP-${Date.now()}`,
        timestamp: new Date().toISOString()
      },
      blocks
    };
  }, [strategy, watchedValues.userName, template]);
  return (
    <AppLayout container>
      <div className="space-y-8 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black flex items-center gap-2">
              <FileText className="text-blue-600" /> Appeal Generator
            </h1>
            <p className="text-muted-foreground italic">Institutional grade advocacy letter construction.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateShareLink({ ...watchedValues, template }))} className="font-bold">
              <Share2 className="h-4 w-4 mr-2" /> Share State
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <TemplateSelector value={template} onValueChange={setTemplate} />
            <Card>
              <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-widest">Case Details</CardTitle></CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField control={form.control} name="userName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Petitioner Name</FormLabel>
                        <FormControl><Input {...field} className="border-2" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="facilityName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Provider/Facility</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. UPMC Mercy" className="border-2" /></FormControl>
                      </FormItem>
                    )} />
                  </form>
                </Form>
              </CardContent>
            </Card>
            <PDFGeneratorUI 
              reportData={reportJson} 
              fileName={`Appeal-${watchedValues.userName.replace(/\s+/g, '-')}.pdf`} 
            />
          </div>
          <Card className="lg:col-span-8 border-slate-200 overflow-hidden shadow-2xl">
             <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
               <div className="flex items-center gap-2">
                 <ShieldCheck className="h-5 w-5 text-blue-600" />
                 <CardTitle className="text-sm font-black uppercase tracking-widest">Formal Adjudication Draft</CardTitle>
               </div>
               <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    navigator.clipboard.writeText(strategy.text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-xs font-bold"
               >
                 {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                 Copy Text
               </Button>
             </CardHeader>
             <CardContent className="p-0">
               <div className="bg-white p-12 min-h-[650px] font-serif shadow-inner">
                 <div className="border-b-4 border-slate-900 pb-4 mb-10">
                   <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">OFFICIAL NOTICE OF GRIEVANCE</h2>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Forensic Integrity Guaranteed</p>
                 </div>
                 <div className="bg-slate-50/50 p-8 rounded-lg border border-slate-100 whitespace-pre-wrap text-[13pt] leading-relaxed text-slate-800 italic">
                   {strategy.text}
                 </div>
               </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}