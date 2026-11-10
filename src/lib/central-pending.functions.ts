import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const getCentralSnapshot=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const r=await context.supabase.rpc('central_admin_snapshot');if(r.error)throw new Error(r.error.message);return JSON.stringify(r.data);
});
