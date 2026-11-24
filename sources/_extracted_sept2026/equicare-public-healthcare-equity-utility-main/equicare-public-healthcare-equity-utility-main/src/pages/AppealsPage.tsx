import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api-client';
import { Appeal } from '@shared/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Gavel, Plus, FileText, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
export function AppealsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const tenantId = 't1';
  const { data: appeals, isLoading } = useQuery({
    queryKey: ['appeals', tenantId],
    queryFn: () => api<Appeal[]>(`/api/appeals?tenant_id=${tenantId}`)
  });
  const mutation = useMutation({
    mutationFn: (data: Partial<Appeal>) => api<Appeal>('/api/appeals', {
      method: 'POST',
      body: JSON.stringify({ ...data, tenantId })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appeals'] });
      toast.success('Appeal filed successfully');
    }
  });
  const handleFileAppeal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    mutation.mutate({
      token: formData.get('token') as string,
      cpt: formData.get('cpt') as string,
      billedAmount: Number(formData.get('amount')),
      notes: formData.get('notes') as string,
    });
  };
  const filteredAppeals = appeals?.filter(a => 
    a.token.toLowerCase().includes(filter.toLowerCase()) || 
    a.cpt.includes(filter)
  );
  const stats = appeals?.reduce((acc, a) => {
    if (a.status === 'WON') acc.won++;
    if (a.status === 'LOST') acc.lost++;
    acc.total++;
    return acc;
  }, { won: 0, lost: 0, total: 0 }) || { won: 0, lost: 0, total: 0 };
  return (
    <AppLayout container contentClassName="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3">
            <Gavel className="h-9 w-9 text-primary" />
            Audit Appeals
          </h1>
          <p className="text-muted-foreground">Manage and track disputed audit findings for your organization.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search token/CPT..." 
              className="pl-8 w-[200px] h-9" 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2 h-9">
                <Plus className="h-4 w-4" />
                File New Appeal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dispute Audit Result</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFileAppeal} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="token">Claim Token</Label>
                    <Input id="token" name="token" placeholder="a8f23c91..." required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpt">CPT Code</Label>
                    <Input id="cpt" name="cpt" placeholder="99214" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Billed Amount Disputed</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Justification Notes</Label>
                  <Textarea id="notes" name="notes" placeholder="Detailed reason for appeal..." className="min-h-[100px]" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Processing...' : 'Submit Appeal'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Success Rate" value={`${stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0}%`} icon={CheckCircle2} color="text-emerald-500" />
        <StatCard label="Pending Cases" value={stats.total - stats.won - stats.lost} icon={Clock} color="text-amber-500" />
        <StatCard label="Recovered Equity" value={`$${(stats.won * 450).toLocaleString()}`} icon={FileText} color="text-primary" />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Claim Token</TableHead>
                <TableHead>CPT</TableHead>
                <TableHead>Billed</TableHead>
                <TableHead>Filing Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12">Loading appeals...</TableCell></TableRow>
              ) : filteredAppeals?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No appeals found matching criteria.</TableCell></TableRow>
              ) : filteredAppeals?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs font-bold">{a.token}</TableCell>
                  <TableCell><Badge variant="outline">{a.cpt}</Badge></TableCell>
                  <TableCell className="font-medium">${a.billedAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(a.timestamp).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === 'WON' ? 'default' : a.status === 'LOST' ? 'destructive' : 'secondary'} className="gap-1.5">
                      {a.status === 'WON' ? <CheckCircle2 className="h-3 w-3" /> : a.status === 'LOST' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <h3 className="text-3xl font-black mt-1">{value}</h3>
          </div>
          <div className={cn("p-3 rounded-xl bg-muted/50", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}