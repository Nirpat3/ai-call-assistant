import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { onUpdate, applyUpdate, startUpdateChecker, listenForSwUpdates } from "@/lib/app-updater";

export function UpdateBanner() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    onUpdate((version) => {
      setUpdateVersion(version);
      setDismissed(false);
    });
    startUpdateChecker();
    listenForSwUpdates();
  }, []);

  if (!updateVersion || dismissed) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    await applyUpdate();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 text-sm">
        <RefreshCw className="h-4 w-4" />
        <span>A new version is available</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs bg-white text-blue-600 hover:bg-blue-50"
          onClick={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? "Updating..." : "Update Now"}
        </Button>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-blue-500 rounded">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
