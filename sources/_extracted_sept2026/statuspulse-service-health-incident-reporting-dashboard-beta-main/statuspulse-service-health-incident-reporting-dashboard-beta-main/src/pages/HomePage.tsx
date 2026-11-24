import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Plus, Activity, CheckCircle2, History } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ServiceCard } from '@/components/ServiceCard';
import { ReportOutageModal } from '@/components/ReportOutageModal';
import { SERVICES_DATA, INCIDENTS_DATA } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
export function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <header className="glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">StatusPulse</span>
          </div>
          <ThemeToggle className="relative top-0 right-0" />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-12">
          {/* Hero Overall Status */}
          <section className="relative overflow-hidden rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 p-8 md:p-12 text-center">
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" /> All Systems Operational
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-pretty">
                System Status <span className="opacity-40">&</span> Health
              </h1>
              <p className="max-w-xl mx-auto text-muted-foreground text-pretty">
                Real-time monitoring and reporting for all StatusPulse infrastructure and core services. Last checked 2 minutes ago.
              </p>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-5 pointer-events-none">
              <Activity className="w-full h-full scale-150 rotate-12" />
            </div>
          </section>
          {/* Service Grid */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Services</h2>
              <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
                {SERVICES_DATA.length} Tracked
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES_DATA.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </section>
          <Separator className="opacity-50" />
          {/* Incident History */}
          <section className="max-w-4xl space-y-8">
            <div className="flex items-center gap-2">
              <History className="w-6 h-6 text-muted-foreground" />
              <h2 className="text-2xl font-bold">Incident History</h2>
            </div>
            <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-border/50">
              {INCIDENTS_DATA.map((incident) => (
                <div key={incident.id} className="relative pl-10">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center z-10">
                    <div className={`w-2 h-2 rounded-full ${incident.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg">{incident.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        incident.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reported on {new Date(incident.timestamp).toLocaleDateString()}
                    </p>
                    <div className="bg-muted/30 rounded-2xl p-4 border border-border/50 space-y-3">
                      {incident.updates.map((update, i) => (
                        <div key={i} className="flex gap-4 text-sm">
                          <span className="font-mono text-xs opacity-50 whitespace-nowrap">{update.time}</span>
                          <p>{update.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center z-50 hover:bg-primary/90 transition-colors"
        aria-label="Report Outage"
      >
        <Plus className="w-8 h-8" />
      </motion.button>
      <ReportOutageModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      <Toaster position="bottom-center" richColors />
    </div>
  );
}