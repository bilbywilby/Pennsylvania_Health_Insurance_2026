import React from 'react';
import { Facility } from '@shared/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, DollarSign, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
interface FacilityListProps {
  facilities: Facility[];
  fairPrice: number;
}
export function FacilityList({ facilities, fairPrice }: FacilityListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {facilities.map((f) => {
        const isFair = f.estimatedCost <= fairPrice * 1.1;
        return (
          <Card key={f.id} className={cn(
            "flex flex-col h-full border-border/60 transition-all hover:shadow-md",
            isFair && "border-primary/40 bg-primary/[0.02]"
          )}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start mb-2">
                <Badge variant={isFair ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                  {isFair ? 'Fair Price Certified' : 'Standard Provider'}
                </Badge>
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-3 w-3 fill-current", i >= f.transparencyRating && "text-muted opacity-30")} />
                  ))}
                </div>
              </div>
              <CardTitle className="text-lg font-display line-clamp-1">{f.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="line-clamp-1">{f.location}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold text-foreground">
                  ${f.estimatedCost.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">Est. Total</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full justify-between hover:bg-primary hover:text-primary-foreground group" size="sm">
                Choose Provider
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}