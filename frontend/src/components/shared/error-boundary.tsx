// ============================================================
// COD CRM — Error Boundary Component
// ============================================================
// Catches JavaScript errors in child components and displays
// a fallback UI instead of crashing the entire app.
// ============================================================

"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // In production, you could send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-4 max-w-md overflow-auto rounded bg-muted p-2 text-left text-xs text-destructive">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex justify-center gap-4">
              <Button variant="outline" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button onClick={this.handleReload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================
// Page-level Error Boundary (for use in layouts)
// ============================================================

interface PageErrorBoundaryProps {
  children: ReactNode;
}

export function PageErrorBoundary({ children }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-lg">
            <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="mt-6 text-2xl font-bold text-foreground">
              Oops! Something went wrong
            </h1>
            <p className="mt-2 text-muted-foreground">
              We encountered an unexpected error. Our team has been notified.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/")}
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
