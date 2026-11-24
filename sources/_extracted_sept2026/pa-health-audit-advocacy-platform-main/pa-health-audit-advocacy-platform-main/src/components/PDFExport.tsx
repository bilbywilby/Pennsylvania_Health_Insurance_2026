import React from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
interface PDFExportProps {
  contentRef: React.RefObject<Element>;
  documentTitle?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  label?: string;
  showIconOnly?: boolean;
}
export function PDFExport({
  contentRef,
  documentTitle = "PA-Health-Audit-Report",
  variant = "outline",
  className,
  label = "Export PDF",
  showIconOnly = false,
}: PDFExportProps) {
  const preparationToastId = React.useRef<string | number | undefined>(undefined);
  const handlePrint = useReactToPrint({
    contentRef: contentRef as React.RefObject<HTMLDivElement>,
    documentTitle,
    onBeforePrint: () => {
      preparationToastId.current = toast.loading("Preparing document for export...");
      return Promise.resolve();
    },
    onAfterPrint: () => {
      if (preparationToastId.current) {
        toast.dismiss(preparationToastId.current);
      }
      toast.success("Document export complete");
    },
    onPrintError: (errorLocation, error) => {
      if (preparationToastId.current) {
        toast.dismiss(preparationToastId.current);
      }
      console.error(`Print failed at ${errorLocation}:`, error);
      toast.error("Failed to launch print preview. Please check browser permissions.");
    },
  });
  return (
    <Button
      onClick={() => {
        try {
          handlePrint();
        } catch (err) {
          toast.error("An unexpected error occurred during export preparation.");
        }
      }}
      variant={variant}
      className={cn("font-bold gap-2 print:hidden", className)}
      aria-label={label}
      title={label}
    >
      {showIconOnly ? (
        <Printer className="h-4 w-4" />
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}