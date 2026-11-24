import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Service, ServiceStatus } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Activity, ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';
interface ServiceCardProps {
  service: Service;
}
const statusConfig: Record<ServiceStatus, { color: string; icon: React.ReactNode; label: string }> = {
  operational: { 
    color: "bg-emerald-500", 
    icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
    label: "Operational"
  },
  degraded: { 
    color: "bg-amber-500", 
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    label: "Degraded Performance"
  },
  outage: { 
    color: "bg-red-500", 
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    label: "Major Outage"
  },
  maintenance: { 
    color: "bg-blue-500", 
    icon: <Activity className="w-4 h-4 text-blue-500" />,
    label: "Under Maintenance"
  }
};
export function ServiceCard({ service }: ServiceCardProps) {
  const config = statusConfig[service.status];
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="surface-container group hover:border-primary/50 cursor-default">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <h3 className="font-bold text-lg leading-none">{service.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{service.description}</p>
            </div>
            <div className="status-pulse">
              <span className={cn("status-pulse-dot", config.color)} />
              <span className={cn("status-pulse-inner", config.color)} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              {config.icon}
              <span className="text-xs font-medium opacity-80">{config.label}</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Uptime</div>
              <div className="text-sm font-mono font-medium">{service.uptime}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}