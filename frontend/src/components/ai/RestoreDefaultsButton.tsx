"use client";

import { useState } from "react";
import { AiCard } from "@/components/ai/AiCard";
import { AiAlert } from "@/components/ai/AiAlert";
import { Button } from "@/components/ui/button";
import { mlApi } from "@/lib/api/ml-client";

interface RestoreDefaultsButtonProps {
  onRestored: () => void;
}

export function RestoreDefaultsButton({ onRestored }: RestoreDefaultsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await mlApi.restoreDefaults();
      setSuccess(true);
      setConfirming(false);
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AiCard title="Restore Default Models" subtitle="Revert to the original pre-trained models">
      <div className="space-y-3">
        {success && <AiAlert variant="success">Default models restored successfully.</AiAlert>}
        {error && <AiAlert variant="error">{error}</AiAlert>}

        {!confirming ? (
          <Button variant="destructive" onClick={() => setConfirming(true)} className="w-full">
            Restore Defaults
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will replace current models with backed-up defaults. Are you sure?
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleRestore} isLoading={loading} className="flex-1">
                Yes, Restore
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </AiCard>
  );
}
