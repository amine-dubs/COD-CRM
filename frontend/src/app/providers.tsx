"use client";

import { AuthProvider, ThemeProvider, I18nProvider } from "@/providers";
import { ChunkErrorRecovery } from "@/components/chunk-error-recovery";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <ChunkErrorRecovery />
          {children}
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
