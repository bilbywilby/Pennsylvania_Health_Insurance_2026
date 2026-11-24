import React, { useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { useRatingArea } from "@/hooks/useRatingArea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldAlert, LineChart, MapPin, ArrowLeft, CheckCircle2, Download, Share2 } from "lucide-react";
import { NetworkTierCheck } from "@/components/NetworkTierCheck";
import { generateAuditPDF } from "@/lib/reportGenerator";
import { generateShareLink, copyToClipboard } from "@/lib/shareUtils";
import { CarrierRate } from "@/data/ratingAreas";
import { toast } from "sonner";
const CarrierTable = React.memo(({ carriers }: { carriers: CarrierRate[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Carrier Name</TableHead>
        <TableHead>Plan Type</TableHead>
        <TableHead className="text-right">Approved %</TableHead>
        <TableHead className="text-right">Market Share</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {carriers.map((c) => (
        <TableRow key={c.name} className="hover:bg-slate-50">
          <TableCell className="font-bold">{c.name}</TableCell>
          <TableCell><Badge variant="outline">{c.planType}</Badge></TableCell>
          <TableCell className={`text-right font-black ${c.approvedIncrease > 0 ? 'text-red-600' : c.approvedIncrease < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
            {c.approvedIncrease > 0 ? '+' : ''}{c.approvedIncrease.toFixed(1)}%
          </TableCell>
          <TableCell className="text-right text-muted-foreground">{c.marketShare}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
));
export default function RatingAreaPage() {
  const { id } = useParams<{ id: string }>();
  const area = useRatingArea(id);
  const handleExport = async () => {
    if (!area) return;
    const exportPromise = async () => {
      const result = await generateAuditPDF({
        title: `Market Intel: ${area.name}`,
        summary: area.outlook2026,
        riskAssessment: `Rating Area ${area.id} currently holds a volatility score of ${area.volatilityScore}/10.`,
        ratingAreaId: area.id,
        directives: area.regionalInsights,
        findings: area.carriers.map(c => ({
          label: c.name,
          value: `${c.approvedIncrease}% Shift`
        }))
      });
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.fileName;
      link.click();
      return result;
    };
    toast.promise(exportPromise(), {
      loading: 'Synthesizing regional intelligence...',
      success: (data) => (
        <div className="flex flex-col gap-1">
          <span className="font-bold">Forensic Brief Exported</span>
          <span className="text-xs text-muted-foreground">Market data for Area {area.id} is ready.</span>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto w-fit text-blue-600 font-bold"
            onClick={() => window.open(data.url, '_blank')}
          >
            View Full Report
          </Button>
        </div>
      ),
      error: 'Failed to generate regional brief.',
    });
  };
  if (!area) return <AppLayout container><div>Rating Area Not Found</div></AppLayout>;
  return (
    <AppLayout container>
      <div className="space-y-8 animate-fade-in">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="bg-blue-600 text-white font-black uppercase">AREA {area.id}</Badge>
              <Badge variant="secondary" className="font-bold text-[10px] uppercase">{area.counties.length} COUNTIES</Badge>
            </div>
            <h1 className="text-5xl font-black tracking-tighter leading-none">{area.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateShareLink({ areaId: area.id }))} className="font-bold">
              <Share2 className="h-4 w-4 mr-2" /> Share Insight
            </Button>
            <Button size="sm" onClick={handleExport} className="bg-slate-900 text-white font-bold">
              <Download className="h-4 w-4 mr-2" /> Forensic Brief
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center gap-2 border-b bg-slate-50/50">
                <LineChart className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm font-black uppercase tracking-widest">Market Outlook 2026</CardTitle>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                <p className="text-2xl font-medium leading-relaxed italic text-slate-700 border-l-8 border-blue-500 pl-6">
                  {area.outlook2026}
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {area.regionalInsights.map((insight, idx) => (
                    <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-blue-200 transition-colors">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                      <span className="text-sm font-bold text-slate-700 leading-relaxed">{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Carrier Rate Benchmark</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <CarrierTable carriers={area.carriers} />
                </div>
              </CardContent>
            </Card>
          </div>
          <aside className="lg:col-span-4 space-y-8">
            <NetworkTierCheck ratingAreaId={area.id} volatilityScore={area.volatilityScore} />
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Strategic Protocols
              </h3>
              {area.protocols.map((p, i) => (
                <Card key={i} className="border-2 border-l-8 border-l-blue-600 hover:translate-x-1 transition-transform cursor-default">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-xs font-black uppercase text-blue-900">{p.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{p.action}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}