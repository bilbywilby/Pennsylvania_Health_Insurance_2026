import React from 'react';
import { Link } from 'react-router-dom';
import { Procedure } from '@shared/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Info } from 'lucide-react';
interface ProcedureCardProps {
  procedure: Procedure;
}
export function ProcedureCard({ procedure }: ProcedureCardProps) {
  const savings = procedure.avgPrice - procedure.fairPrice;
  const savingsPercent = Math.round((savings / procedure.avgPrice) * 100);
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md border-border/60 group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div>
            <Badge variant="secondary" className="mb-2 font-mono text-[10px] tracking-wider uppercase">
              CPT {procedure.cptCode}
            </Badge>
            <CardTitle className="text-xl font-display leading-snug group-hover:text-primary transition-colors">
              {procedure.name}
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase text-muted-foreground tracking-wide mt-1">
              {procedure.category}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              Fair Price
              <Info className="h-3 w-3" />
            </span>
            <div className="text-3xl font-display font-extrabold text-primary">
              ${procedure.fairPrice.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Avg Market</span>
            <div className="text-xl font-display font-bold text-foreground/70 line-through decoration-destructive/30 decoration-2">
              ${procedure.avgPrice.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 flex items-center justify-between">
          <span className="text-sm font-semibold text-primary/80">Typical Savings</span>
          <span className="text-sm font-bold text-primary">{savingsPercent}%</span>
        </div>
      </CardContent>
      <CardFooter className="pt-2 bg-secondary/20">
        <Button className="w-full justify-between" variant="ghost" asChild>
          <Link to={`/procedure/${procedure.id}`}>
            View Detailed Analysis
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}