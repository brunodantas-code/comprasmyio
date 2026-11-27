import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePendingActions } from '@/hooks/use-pending-actions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { clearPendingBadge, writePendingBadge, type AppBadgeApi } from '@/lib/app-badge';

const PERMISSION_CHANGED = 'myio-app-badge-permission';

function useBadgePermission() {
  const [state, setState] = useState<{ supported: boolean; permission: NotificationPermission; revision: number }>({ supported: false, permission: 'default', revision: 0 });
  useEffect(() => {
    const update = () => {
      const installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setState(previous => ({ supported: installed && 'setAppBadge' in navigator && 'Notification' in window, permission: 'Notification' in window ? Notification.permission : 'default', revision: previous.revision + 1 }));
    };
    update();
    window.addEventListener('focus', update);
    window.addEventListener(PERMISSION_CHANGED, update);
    document.addEventListener('visibilitychange', update);
    return () => { window.removeEventListener('focus', update); window.removeEventListener(PERMISSION_CHANGED, update); document.removeEventListener('visibilitychange', update); };
  }, []);
  return state;
}

/** A single root observer follows the same identity-scoped count as the ERP menu. No service worker or offline cache. */
export function PendingAppBadgeSync() {
  const user = useCurrentUser();
  const pending = usePendingActions();
  const { supported, permission, revision } = useBadgePermission();
  useEffect(() => {
    if (!supported) return;
    if (user.isSuccess && !user.data) { void clearPendingBadge(navigator as AppBadgeApi); return; }
    if (user.data && pending.isSuccess && !pending.isError && pending.data) void writePendingBadge(navigator as AppBadgeApi, pending.data.total, permission);
  }, [supported, permission, revision, user.isSuccess, user.data?.id, pending.data?.total, pending.isSuccess, pending.isError]);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') void clearPendingBadge(navigator as AppBadgeApi);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}

export function PendingAppBadgeMenuItem({ className }: { className: string }) {
  const { supported, permission } = useBadgePermission();
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  if (!supported) return null;
  const authorize = async () => {
    setBusy(true);
    try {
      // Must run directly inside the user's tap, before any asynchronous work.
      const result = permission === 'granted' ? 'granted' : await Notification.requestPermission();
      window.dispatchEvent(new Event(PERMISSION_CHANGED));
      if (result !== 'granted') { toast.info('Autorize notificações nos ajustes do iPhone para exibir o contador.'); return; }
      await qc.invalidateQueries({ queryKey: ['pending-actions'] });
      toast.success('Contador autorizado para mostrar suas pendências no ícone.');
    } catch { toast.error('Não foi possível ativar o contador neste dispositivo.'); }
    finally { setBusy(false); }
  };
  return <Button cdeIgnore variant="ghost" className={className} disabled={busy} onClick={() => { void authorize(); }}><BellRing className="h-5 w-5" />{permission === 'granted' ? 'Atualizar contador no ícone' : 'Ativar contador no ícone'}</Button>;
}