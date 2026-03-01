"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { RotateCcw } from "lucide-react";

interface RestoreDefaultsButtonProps {
  onRestore: () => Promise<void>;
  isLoading: boolean;
}

export function RestoreDefaultsButton({
  onRestore,
  isLoading,
}: RestoreDefaultsButtonProps) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await onRestore();
    setConfirming(false);
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="danger"
        onClick={handleClick}
        isLoading={isLoading}
        size="md"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        {confirming ? "Confirm Restore?" : "Restore Default Models"}
      </Button>
      {confirming && !isLoading && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
