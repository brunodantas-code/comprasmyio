import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const getCentralSnapshot=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const r=await context.supabase.rpc('central_admin_snapshot');if(r.error)throw new Error(r.error.message);
 const spend=await context.supabase.rpc('spend_pending_adjustments',{_all:true});if(spend.error)throw new Error(spend.error.message);
 const snapshot=r.data && typeof r.data==='object' && !Array.isArray(r.data) ? r.data : {};
 return JSON.stringify({...snapshot,spendAdjustments:spend.data});
});
