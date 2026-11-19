import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const signInventory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ inventoryId: z.string().uuid(), completedAt: z.string().datetime({ offset: true }), password: z.string().min(1).max(256) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: identity, error: identityError } = await context.supabase.auth.getUser();
    if (identityError || !identity.user?.email) throw new Error('Entre novamente para assinar');
    const { data: signer, error } = await context.supabase.from('stock_inventory_signatures').select('user_id,signed_at').eq('inventory_id', data.inventoryId).eq('user_id', context.userId).maybeSingle();
    if (error || !signer || signer.signed_at) throw new Error('Assinatura indisponível');
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error('Não foi possível confirmar sua senha');
    const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } } });
    const { data: verified, error: passwordError } = await verifier.auth.signInWithPassword({ email: identity.user.email, password: data.password });
    if (passwordError || verified.user?.id !== context.userId) throw new Error('Senha incorreta. Assinatura não realizada');
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data: signedAt, error: signingError } = await supabaseAdmin.rpc('apply_verified_inventory_signature', { _inventory_id: data.inventoryId, _user_id: context.userId, _expected_completed_at: data.completedAt });
      if (signingError) throw new Error(signingError.message);
      return { signedAt };
    } finally { await verifier.auth.signOut({ scope: 'local' }); }
  });