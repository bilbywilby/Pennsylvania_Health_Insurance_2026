import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, Info, AlertTriangle } from "lucide-react";
import networksData from "@/data/networks.json";
interface NetworkTierCheckProps {
  ratingAreaId: string;
  volatilityScore?: number;
}
export function NetworkTierCheck({ ratingAreaId, volatilityScore = 0 }: NetworkTierCheckProps) {
  const systems = networksData.hospital_systems.filter(
    (s) => s.rating_area === ratingAreaId
  );
  if (systems.length === 0) return null;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            Network Tiering Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold">Health System</TableHead>
                  <TableHead className="text-[10px] font-bold text-right">Resilience</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systems.map((system) => (
                  <TableRow key={system.name}>
                    <TableCell className="py-2">
                      <p className="text-xs font-bold">{system.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {system.key_counties.join(", ")}
                      </p>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <Badge variant={system.resilience_rating > 90 ? "default" : "secondary"} className="text-[10px]">
                        {system.resilience_rating}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {volatilityScore >= 8 && (
            <Alert className="mt-4 border-amber-200 bg-amber-50/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-[10px] font-black uppercase text-amber-800">Localized Risk Alert</AlertTitle>
              <AlertDescription className="text-[10px] text-amber-700 leading-tight">
                High volatility in Area {ratingAreaId} detected. Cross-verify provider tiering before finalizing Silver upgrades.
              </AlertDescription>
            </Alert>
          )}
          <div className="mt-4 flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
            <Info className="h-3 w-3 text-blue-600 mt-0.5" />
            <p className="text-[9px] text-blue-700 leading-tight font-medium">
              Tier-1 systems (Resilience &gt; 90%) have prioritized arbitration pathways under PA Act 68.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}