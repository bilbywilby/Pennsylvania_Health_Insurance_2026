import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { TemplateType, ADVOCACY_TEMPLATES } from './AppealTemplatesData';
interface TemplateSelectorProps {
  value: TemplateType;
  onValueChange: (val: TemplateType) => void;
}
export function TemplateSelector({ value, onValueChange }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Select Advocacy Strategy</label>
        <Select value={value} onValueChange={(v) => onValueChange(v as TemplateType)}>
          <SelectTrigger className="w-full h-12 border-2 focus:ring-blue-500">
            <SelectValue placeholder="Select Template" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ADVOCACY_TEMPLATES).map(([key, t]) => (
              <SelectItem key={key} value={key} className="py-3">
                <div className="flex flex-col gap-1">
                  <span className="font-bold">{t.title}</span>
                  <span className="text-[10px] text-muted-foreground">{t.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card className="bg-slate-50 border-dashed border-2">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-black uppercase tracking-widest">Clinical Strength</span>
            </div>
            <Badge variant={ADVOCACY_TEMPLATES[value].strength === 'Critical' ? 'destructive' : 'default'} className="uppercase text-[10px] font-bold">
              {ADVOCACY_TEMPLATES[value].strength}
            </Badge>
          </div>
          <div className="space-y-2">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Relevant PA Statutes</p>
             <div className="flex flex-wrap gap-2">
                {ADVOCACY_TEMPLATES[value].citations.map(c => (
                  <Badge key={c} variant="outline" className="bg-white text-[9px] border-slate-200">{c}</Badge>
                ))}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}