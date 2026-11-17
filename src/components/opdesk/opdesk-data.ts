import { queryOptions } from "@tanstack/react-query";
import { getOpdeskData, getOpdeskTaskDetails } from "./opdesk.functions";
export const opdeskOptions = queryOptions({queryKey:["opdesk"],queryFn:()=>getOpdeskData()});
export const opdeskTaskOptions = (id:string) => queryOptions({queryKey:["opdesk-details",id],queryFn:()=>getOpdeskTaskDetails({data:{id}})});