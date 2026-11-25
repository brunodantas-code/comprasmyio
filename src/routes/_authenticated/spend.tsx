import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { spendOptions } from "@/components/spend/data";
import { SpendWorkspace } from "@/components/spend/workspace";
export const Route = createFileRoute("/_authenticated/spend")({
  validateSearch: (s: Record<string, unknown>): { adjustment?: string; advance?: string } => ({ ...(typeof s["adjustment"] === "string" ? { adjustment: s["adjustment"] } : {}), ...(typeof s["advance"] === "string" ? { advance: s["advance"] } : {}) }),
  beforeLoad: async () => { const r=await supabase.rpc("spend_role");if(r.error)throw r.error;if(!r.data)throw redirect({to:"/portal"}); },
  loader:({context})=>context.queryClient.ensureQueryData(spendOptions), component:SpendWorkspace,
  head:()=>({meta:[{title:"Spend | Gestão de cartões e despesas myio"},{name:"description",content:"Comprovantes, faturas de cartão e conciliação contábil integrada ao Finance myio."},{property:"og:title",content:"Spend | Gestão de cartões e despesas myio"},{property:"og:description",content:"Registro de gastos, leitura de faturas e classificação financeira no ERP myio."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),
});