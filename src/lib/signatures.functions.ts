import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { signDocumentSchema } from './signatures';

export const signLegalDocument = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => signDocumentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: identity, error: identityError } = await context.supabase.auth.getUser();
    if (identityError || !identity.user?.email) throw new Error('Entre novamente para assinar');
    const { data: record, error } = await context.supabase.from('legal_records').select('id').eq('id', data.recordId).single();
    if (error || !record) throw new Error('Documento indisponível');
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
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    try {
      const { data: signedAt, error: signingError } = await supabaseAdmin.rpc('apply_verified_legal_signature', {
        _record_id: data.recordId, _user_id: context.userId, _participant_id: data.participantId ?? '', _expected_updated_at: data.expectedUpdatedAt,
      });
      if (signingError) throw new Error(signingError.message);
      return { signedAt };
    } finally {
      await verifier.auth.signOut({ scope: 'local' });
    }
  });