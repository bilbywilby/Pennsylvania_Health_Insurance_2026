import React from 'react';
import { Loader2 } from "lucide-react";
export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Forensic Intelligence...</p>
    </div>
  );
}