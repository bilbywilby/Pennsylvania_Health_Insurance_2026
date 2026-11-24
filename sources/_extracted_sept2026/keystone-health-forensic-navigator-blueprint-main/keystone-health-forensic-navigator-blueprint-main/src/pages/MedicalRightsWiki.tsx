import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Scale, BookOpen, ExternalLink } from "lucide-react";
import { PA_STATUTES } from "@/lib/forensic-core";
export default function MedicalRightsWiki() {
  const [search, setSearch] = useState("");
  const filteredStatutes = PA_STATUTES.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.text.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <AppLayout className="bg-slate-950 min-h-screen text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-8 animate-fade-in">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Medical Rights Wiki</h1>
            <p className="text-muted-foreground max-w-2xl">
              Searchable database of Pennsylvania healthcare statutes, clinical consent laws, and forensic auditing standards.
            </p>
          </div>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search statutes, IDs or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary text-secondary-foreground border-input focus:ring-sky-500"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <Accordion type="single" collapsible className="space-y-4">
                {filteredStatutes.map((statute) => (
                  <AccordionItem 
                    key={statute.id} 
                    value={statute.id}
                    className="bg-card border-border rounded-lg border px-4 overflow-hidden"
                  >
                    <AccordionTrigger className="hover:no-underline py-6">
                      <div className="flex flex-col items-start text-left gap-1">
                        <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest">{statute.id}</span>
                        <span className="text-lg font-semibold">{statute.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6">
                      <div className="space-y-4">
                        <div className="bg-accent/50 p-4 rounded-lg border border-input">
                          <p className="text-sm leading-relaxed text-foreground">
                            {statute.text}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Scale className="size-3" />
                            Citation: {statute.citation}
                          </span>
                          <button className="flex items-center gap-1 hover:text-sky-400 transition-colors">
                            View Official Register <ExternalLink className="size-3" />
                          </button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {filteredStatutes.length === 0 && (
                <Card className="bg-card border-border border-dashed py-12 text-center">
                  <CardContent>
                    <BookOpen className="size-8 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">No matching statutes found for "{search}"</p>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="space-y-6">
              <Card className="bg-card border-border glass p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Wiki Quick-Nav</h3>
                <nav className="space-y-2">
                  {['Minor Consent', 'Financial Appeals', 'Forensic Standards'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSearch(cat)}
                      className="w-full text-left text-sm py-2 px-3 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {cat}
                    </button>
                  ))}
                </nav>
              </Card>
              <Card className="bg-sky-500/10 border-sky-500/20 p-6">
                <h3 className="text-sm font-bold text-sky-400 mb-2">Legal Disclaimer</h3>
                <p className="text-[10px] leading-relaxed text-sky-400/80">
                  This database is for informational purposes for professional healthcare auditors. It does not constitute legal advice. Verify all citations against the latest PA Bulletin.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}