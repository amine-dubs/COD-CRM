// ============================================================
// COD CRM — Auth Guard Component
// ============================================================
// Protects routes requiring authentication. Redirects to login
// if user is not authenticated, with return URL preserved.
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores";
import { getAccessToken } from "@/lib/auth";
import { PageLoader } from "@/components/shared";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, fetchProfile } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();

      if (!token) {
        // No token — redirect to login
        const returnUrl = encodeURIComponent(pathname);
        router.replace(`/login?redirect=${returnUrl}`);
        return;
      }

      // Token exists — verify it's still valid
      if (!isAuthenticated && !isLoading) {
        try {
          // Check if this is a super admin
          const userType = localStorage.getItem("user_type");
          if (userType === "admin") {
            const { adminFetchProfile } = useAuthStore.getState();
            await adminFetchProfile();
          } else {
            await fetchProfile();
          }
        } catch {
          // Token invalid — redirect to login
          const returnUrl = encodeURIComponent(pathname);
          router.replace(`/login?redirect=${returnUrl}`);
          return;
        }
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, isLoading, fetchProfile, router, pathname]);

  // Show loading while checking auth
  if (isChecking || isLoading) {
    return <PageLoader text="Verifying authentication..." />;
  }

  // Not authenticated — will redirect
  if (!isAuthenticated) {
    return <PageLoader text="Redirecting to login..." />;
  }

  // Authenticated — render children
  return <>{children}</>;
}
