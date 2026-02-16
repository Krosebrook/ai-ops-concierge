import { useElectron } from '@/hooks/useElectron';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function OfflineIndicator() {
  const { isElectron, isOffline, syncStatus, api } = useElectron();

  if (!isElectron) return null;

  const handleSync = async () => {
    try {
      await api.triggerSync();
      toast.success('Sync started');
    } catch (error) {
      toast.error('Sync failed: ' + error.message);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOffline ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <CloudOff className="w-5 h-5 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">Offline Mode</p>
            <p className="text-amber-700 text-xs">
              {syncStatus?.pendingChanges || 0} pending changes
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-emerald-600" />
          <div className="text-sm">
            <p className="font-medium text-emerald-900">Online</p>
            <p className="text-emerald-700 text-xs">
              {syncStatus?.lastSync
                ? `Synced ${new Date(syncStatus.lastSync).toLocaleTimeString()}`
                : 'Syncing...'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            className="ml-2 h-8 w-8"
          >
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          </Button>
        </div>
      )}
    </div>
  );
}