import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const getCentralSnapshot=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const [r,spend,advances]=await Promise.all([context.supabase.rpc('central_admin_snapshot'),context.supabase.rpc('spend_pending_adjustments',{_all:true}),context.supabase.rpc('spend_pending_advances',{_all:true})]);
 if(r.error)throw new Error(r.error.message);if(spend.error)throw new Error(spend.error.message);if(advances.error)throw new Error(advances.error.message);
 const snapshot=r.data && typeof r.data==='object' && !Array.isArray(r.data) ? r.data : {};
 return JSON.stringify({...snapshot,spendAdjustments:spend.data,spendAdvances:advances.data});
});
