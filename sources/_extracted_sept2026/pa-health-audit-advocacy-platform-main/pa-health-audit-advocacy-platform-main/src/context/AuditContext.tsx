import React, { useState, useEffect, useCallback } from 'react';
import { AuditState, DEFAULT_STATE } from '@/lib/types';
import { AuditContext } from './AuditContextCore';
export function AuditProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuditState>(() => {
    const saved = localStorage.getItem('pa_audit_v1');
    return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : DEFAULT_STATE;
  });
  useEffect(() => {
    localStorage.setItem('pa_audit_v1', JSON.stringify(state));
  }, [state]);
  const updateState = useCallback((updates: Partial<AuditState>) => {
    setState(prev => ({ ...prev, ...updates, timestamp: new Date().toISOString() }));
  }, []);
  const resetState = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);
  return (
    <AuditContext.Provider value={{ state, updateState, resetState }}>
      {children}
    </AuditContext.Provider>
  );
}