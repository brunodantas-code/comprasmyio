import type { CentralSnapshot } from '@/lib/central-pending';
import { queryOptions } from '@tanstack/react-query';
import { getCentralSnapshot } from '@/lib/central-pending.functions';
export const centralOptions=queryOptions({queryKey:['central-admin'],queryFn:async()=>JSON.parse(await getCentralSnapshot()) as CentralSnapshot,staleTime:15000});
