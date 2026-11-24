import { createContext } from 'react';
import { AuditContextType } from '@/lib/types';
export const AuditContext = createContext<AuditContextType | undefined>(undefined);