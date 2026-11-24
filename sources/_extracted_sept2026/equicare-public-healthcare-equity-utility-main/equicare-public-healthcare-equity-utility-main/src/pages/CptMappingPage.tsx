import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api-client';
import { ConsensusMapping } from '@shared/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Search, ThumbsUp, Info, CheckCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
export function CptMappingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['consensus'],
    queryFn: () => api<ConsensusMapping[]>('/api/consensus')
  });
  const voteMutation = useMutation({
    mutationFn: (id: string) => api<ConsensusMapping>('/api/map-cpt', {
      method: 'POST',
      body: JSON.stringify({ id })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consensus'] });
      toast.success('Vote recorded');
    }
  });
  const filtered = mappings?.filter(m => 
    m.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.suggestedCpt.includes(searchTerm)
  );
  return (
    <AppLayout container contentClassName="space-y-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <Database className="h-10 w-10 text-primary" />
          CPT Consensus Hub
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl">
          Standardizing ambiguous insurance descriptions into verified CPT codes through community voting and PA Health Equity 2026 standards.
        </p>
      </div>
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          className="pl-10 h-14 rounded-2xl text-lg shadow-sm"
          placeholder="Search descriptions (e.g. 'Complex Spine Imaging')..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p>Loading consensus data...</p>
        ) : filtered?.map((m) => (
          <Card key={m.id} className="group hover:border-primary/40 transition-all shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge variant={m.verified ? "default" : "secondary"} className="gap-1 font-mono text-[10px]">
                  {m.verified ? <CheckCircle className="h-3 w-3" /> : <HelpCircle className="h-3 w-3" />}
                  {m.verified ? 'Verified' : 'Community'}
                </Badge>
                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                  <ThumbsUp className="h-3 w-3" />
                  {m.votes} Votes
                </div>
              </div>
              <CardTitle className="text-xl font-display leading-tight">{m.description}</CardTitle>
              <CardDescription className="font-mono text-primary font-bold text-lg">CPT {m.suggestedCpt}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-secondary/30 rounded-lg flex items-start gap-2 text-xs">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="leading-relaxed italic">
                  Suggested based on PA 2026 CMS Medical Necessity guidelines for outpatient spinal procedures.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                onClick={() => voteMutation.mutate(m.id)}
                disabled={voteMutation.isPending}
              >
                Confirm Mapping
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}