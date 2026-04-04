"use client";

import { AuthProvider, ThemeProvider, I18nProvider } from "@/providers";
import { ChunkErrorRecovery } from "@/components/chunk-error-recovery";
import { PageErrorBoundary } from "@/components/shared";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <ChunkErrorRecovery />
          <PageErrorBoundary>{children}</PageErrorBoundary>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
