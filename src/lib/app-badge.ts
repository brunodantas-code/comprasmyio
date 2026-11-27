export type AppBadgeApi = {
  setAppBadge?: (count: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** Never publish a loading/failed count or use another source for personal pendencies. */
export async function writePendingBadge(api: AppBadgeApi, total: number, permission: NotificationPermission): Promise<boolean> {
  if (permission !== 'granted' || !Number.isSafeInteger(total) || total < 0) return false;
  try {
    if (total === 0) {
      if (!api.clearAppBadge) return false;
      await api.clearAppBadge();
    } else {
      if (!api.setAppBadge) return false;
      await api.setAppBadge(total);
    }
    return true;
  } catch { return false; }
}

export async function clearPendingBadge(api: AppBadgeApi) {
  try { await api.clearAppBadge?.(); } catch { /* Unsupported/blocked badges must never break signing out. */ }
}