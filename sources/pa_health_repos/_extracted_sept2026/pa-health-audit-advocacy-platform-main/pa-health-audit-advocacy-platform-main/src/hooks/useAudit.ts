import { useContext } from 'react';
import { AuditContext } from '@/context/AuditContextCore';
import { AuditContextType } from '@/lib/types';
export function useAudit(): AuditContextType {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
}