import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AccessUserRow } from "@/components/access/access-user-row";
import { AccessStatusTabs, putInactiveLast, type AccessStatusFilter } from "@/components/access/access-status-tabs";

export function SurveyUsersAdmin() {
  const [userToRemove, setUserToRemove] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [status, setStatus] = useState<AccessStatusFilter>("all");
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["site-survey-users-admin"],
    queryFn: async () => {
      const [{ data: accesses }, { data: profiles }, { data: definitions }, { data: surveyProfiles }] = await Promise.all([
        supabase.from("user_app_access").select("user_id").eq("app_key", "site_survey"),
        supabase.from("profiles").select("id,full_name,email,is_active").is("deleted_at", null).order("full_name"),
        supabase.from("site_survey_access_profiles").select("code,name").eq("active", true).order("name"),
        supabase.from("site_survey_user_profiles").select("user_id,profile_code,is_customized"),
      ]);
      const ids = new Set((accesses ?? []).map((item) => item.user_id));
      return {
        users: (profiles ?? []).filter((item) => ids.has(item.id)),
        definitions: definitions ?? [],
        surveyProfiles: new Map((surveyProfiles ?? []).map((item) => [item.user_id, item])),
      };
    },
  });

  const allUsers = data?.users ?? [];
  const users = putInactiveLast(allUsers.filter((user) => status === "all" || (status === "active" ? user.is_active !== false : user.is_active === false)), (user) => user.is_active !== false);
  const statusCounts = {
    all: allUsers.length,
    active: allUsers.filter((user) => user.is_active !== false).length,
    inactive: allUsers.filter((user) => user.is_active === false).length,
  };

  const setProfile = async (userId: string, profileCode: string) => {
    const { error } = await supabase.from("site_survey_user_profiles").upsert({ user_id: userId, profile_code: profileCode, is_customized: false });
    if (error) return toast.error(error.message);
    await supabase.from("site_survey_user_permissions").delete().eq("user_id", userId);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["site-survey-users-admin"] });
  };

  const removeAccess = async () => {
    if (!userToRemove) return;
    setRemoving(true);
    const { error } = await supabase.from("user_app_access").delete().eq("user_id", userToRemove.id).eq("app_key", "site_survey");
    setRemoving(false);
    if (error) return toast.error(error.message);
    setUserToRemove(null);
    toast.success("Acesso ao Site Survey removido");
    await qc.invalidateQueries({ queryKey: ["site-survey-users-admin"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários · Site Survey</CardTitle>
        <CardDescription>Atribua um perfil do Site Survey aos usuários liberados no portal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <AccessStatusTabs className="mb-2" value={status} onChange={setStatus} counts={statusCounts} />
        {users.map((user) => (
          <AccessUserRow
            key={user.id}
            name={user.full_name || "Sem nome"}
            email={user.email}
            inactive={user.is_active === false}
            badges={user.is_active === false ? <span className="text-xs text-destructive">Inativo</span> : null}
            controls={
              <div className="flex min-w-0 items-center gap-2 max-sm:col-span-2 sm:w-[280px]">
                <Select value={data?.surveyProfiles.get(user.id)?.profile_code ?? "tecnico"} onValueChange={(value) => void setProfile(user.id, value)}>
                  <SelectTrigger className="min-w-0 flex-1" aria-label={`Perfil de ${user.full_name || "usuário"}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{data?.definitions.map((profile) => <SelectItem key={profile.code} value={profile.code}>{profile.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="compactIcon" className="shrink-0" aria-label={`Remover ${user.full_name || "usuário"} do Site Survey`} title="Remover acesso" onClick={() => setUserToRemove({ id: user.id, name: user.full_name || user.email || "este usuário" })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            }
          />
        ))}
        <AlertDialog open={Boolean(userToRemove)} onOpenChange={(open) => { if (!open && !removing) setUserToRemove(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover acesso ao Site Survey?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação removerá o acesso de {userToRemove?.name} somente ao Site Survey. A conta e os acessos aos demais aplicativos serão mantidos.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={removing} onClick={(event) => { event.preventDefault(); void removeAccess(); }}>{removing ? "Excluindo..." : "Excluir"}</AlertDialogAction>
              <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
