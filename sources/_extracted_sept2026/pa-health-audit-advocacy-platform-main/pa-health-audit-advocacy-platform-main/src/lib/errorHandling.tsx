import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from "sonner";
import { Logger } from "./logger";
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export class ErrorHandler {
  static logError(severity: ErrorSeverity, context: string, message: string, error?: unknown) {
    Logger.error(message, context, error);
    if (severity === 'high' || severity === 'critical') {
      toast.error(`System Alert: ${message}`, {
        description: "This incident has been logged for forensic review.",
      });
    }
  }
}
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}
export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };
  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    ErrorHandler.logError('critical', 'ReactLifecycle', error.message, errorInfo);
  }
  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <h1 className="text-4xl font-black text-slate-900">Forensic Halt</h1>
            <p className="text-slate-600">A critical application error occurred. Our engineers have been notified.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold"
            >
              Return to Command Center
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}