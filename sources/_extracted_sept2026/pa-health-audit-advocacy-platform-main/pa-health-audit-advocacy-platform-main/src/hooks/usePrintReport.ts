import { useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
export function usePrintReport(documentTitle: string = "PA-Health-Audit") {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle,
    onAfterPrint: () => toast.success("Advocacy Report Generated Successfully"),
  });
  return {
    componentRef,
    handlePrint: useCallback(() => handlePrint(), [handlePrint]),
  };
}