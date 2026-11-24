import React from 'react';
import { Claim } from '@shared/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
interface ClaimLedgerTableProps {
  data: Claim[];
}
export function ClaimLedgerTable({ data }: ClaimLedgerTableProps) {
  return (
    <div className="rounded-md border bg-background overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="w-[120px]">Claim Token</TableHead>
            <TableHead>CPT Code</TableHead>
            <TableHead>Billed</TableHead>
            <TableHead>Est. FMV</TableHead>
            <TableHead>Variance</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No transactions found in this ledger.
              </TableCell>
            </TableRow>
          ) : (
            data.map((claim) => {
              const variance = claim.fmvResult ? ((claim.billedAmount - claim.fmvResult) / claim.fmvResult) * 100 : 0;
              return (
                <TableRow key={claim.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs font-semibold">{claim.token}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-[10px]">{claim.cpt}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">${claim.billedAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {claim.fmvResult ? `$${claim.fmvResult.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-xs font-bold",
                      variance > 50 ? "text-destructive" : variance > 20 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {variance > 0 ? `+${variance.toFixed(1)}%` : `${variance.toFixed(1)}%`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        claim.riskLevel === 'HIGH' ? "bg-destructive animate-pulse" : claim.riskLevel === 'MED' ? "bg-amber-500" : "bg-emerald-500"
                      )} />
                      <span className="text-[10px] font-bold uppercase">{claim.riskLevel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={claim.status === 'AUDITED' ? 'default' : 'secondary'} className="text-[10px]">
                      {claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}