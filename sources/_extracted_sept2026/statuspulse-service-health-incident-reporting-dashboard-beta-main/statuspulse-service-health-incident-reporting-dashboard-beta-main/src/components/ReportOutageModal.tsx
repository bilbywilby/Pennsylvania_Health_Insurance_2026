import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Send, X } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SERVICES_DATA } from '@/lib/mockData';
import { toast } from 'sonner';
interface ReportOutageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function ReportOutageModal({ open, onOpenChange }: ReportOutageModalProps) {
  const [serviceId, setServiceId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !description) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    toast.success("Report submitted successfully", {
      description: "Our engineering team has been notified."
    });
    setServiceId("");
    setDescription("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent className="sm:max-w-[425px] border-none bg-card p-0 overflow-hidden shadow-2xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="p-6 space-y-6"
            >
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl w-fit">
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onOpenChange(false)}
                    className="rounded-full h-8 w-8 hover:bg-muted"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <DialogTitle className="text-2xl font-bold pt-4">Report an Incident</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Are you experiencing issues? Help us identify problems faster.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service">Affected Service</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger id="service" className="rounded-xl border-border/50 bg-muted/30">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES_DATA.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">What's happening?</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the issue you're seeing..."
                    className="min-h-[120px] rounded-xl border-border/50 bg-muted/30 resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Send className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <span className="flex items-center gap-2">
                      Submit Report <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}