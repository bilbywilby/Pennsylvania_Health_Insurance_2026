export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}
const IS_DEV = import.meta.env.DEV;
export class Logger {
  private static formatMessage(level: string, message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const ctxLabel = context ? `[${context}] ` : '';
    return `${timestamp} [${level}] ${ctxLabel}${message}`;
  }
  static debug(message: string, context?: string) {
    if (IS_DEV) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }
  static info(message: string, context?: string) {
    console.info(this.formatMessage('INFO', message, context));
  }
  static warn(message: string, context?: string) {
    console.warn(this.formatMessage('WARN', message, context));
  }
  static error(message: string, context?: string, error?: unknown) {
    console.error(this.formatMessage('ERROR', message, context), error);
  }
}