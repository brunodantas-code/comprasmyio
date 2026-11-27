import { describe, expect, it, vi } from 'vitest';
import { clearPendingBadge, writePendingBadge } from './app-badge';

describe('contador pessoal no ícone', () => {
  it('mostra exatamente as 72 pendências do usuário', async () => {
    const setAppBadge = vi.fn(async (_count: number) => {});
    expect(await writePendingBadge({ setAppBadge }, 72, 'granted')).toBe(true);
    expect(setAppBadge).toHaveBeenCalledWith(72);
  });
  it('retira a bolinha quando não há pendências', async () => {
    const clearAppBadge = vi.fn(async () => {});
    expect(await writePendingBadge({ clearAppBadge }, 0, 'granted')).toBe(true);
    expect(clearAppBadge).toHaveBeenCalledOnce();
  });
  it('não altera o ícone sem autorização', async () => {
    const setAppBadge = vi.fn(async (_count: number) => {});
    expect(await writePendingBadge({ setAppBadge }, 72, 'denied')).toBe(false);
    expect(await writePendingBadge({ setAppBadge }, 72, 'default')).toBe(false);
    expect(setAppBadge).not.toHaveBeenCalled();
  });
  it('não transforma falhas de leitura em contagens falsas', async () => {
    const clearAppBadge = vi.fn(async () => {});
    expect(await writePendingBadge({ clearAppBadge }, NaN, 'granted')).toBe(false);
    expect(await writePendingBadge({ clearAppBadge }, -1, 'granted')).toBe(false);
    expect(clearAppBadge).not.toHaveBeenCalled();
  });
  it('limpa a contagem ao sair e tolera navegadores sem suporte', async () => {
    const clearAppBadge = vi.fn(async () => {});
    await clearPendingBadge({ clearAppBadge });
    expect(clearAppBadge).toHaveBeenCalledOnce();
    expect(await writePendingBadge({}, 72, 'granted')).toBe(false);
  });
});