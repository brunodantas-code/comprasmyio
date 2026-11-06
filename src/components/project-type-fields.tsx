import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { composeProjectName } from "@/lib/project-naming";

export function useProjectTypes() {
  return useQuery({
    queryKey: ["project-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_types").select("id,name,position,active").order("position").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCanManageProjectTypes() {
  return useQuery({
    queryKey: ["can-manage-project-types"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase.rpc("can_manage_request_subtypes", { _user_id: auth.user.id });
      return !!data;
    },
  });
}

export function ProjectTypeFields({ idPrefix, projectType, shortName, onTypeChange, onNameChange, inlineLayout = false }: {
  idPrefix: string;
  projectType: string;
  shortName: string;
  onTypeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  inlineLayout?: boolean;
}) {
  const qc = useQueryClient();
  const { data: types } = useProjectTypes();
  const { data: canManage } = useCanManageProjectTypes();
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("");
  const active = (types ?? []).filter((type) => type.active || type.name === projectType);

  const add = useMutation({
    mutationFn: async (name: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const position = Math.max(0, ...(types ?? []).map((type) => type.position)) + 1;
      const { error } = await supabase.from("project_types").insert({ name, position, created_by: auth.user?.id });
      if (error) throw new Error(error.code === "23505" ? "Este tipo já está cadastrado" : error.message);
    },
    onSuccess: (_, name) => {
      qc.invalidateQueries({ queryKey: ["project-types"] });
      onTypeChange(name);
      setAdding(false);
      setNewType("");
      toast.success("Tipo de projeto cadastrado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const preview = composeProjectName(projectType, shortName);

  return (
    <>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Tipo de projeto</Label>
          {canManage && (
            <Button type="button" variant="ghost" size="compactIcon" title="Novo tipo de projeto" aria-label="Novo tipo de projeto" onClick={() => setAdding((value) => !value)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {adding ? (
          <div className="flex gap-2">
            <Input autoFocus value={newType} onChange={(event) => setNewType(event.target.value)} placeholder="Novo tipo" maxLength={60} />
            <Button type="button" variant="outline" disabled={add.isPending || newType.trim().length < 2} onClick={() => add.mutate(newType.replace(/\|/g, " ").trim())}>Salvar</Button>
          </div>
        ) : (
          <Select value={projectType || undefined} onValueChange={onTypeChange}>
            <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
            <SelectContent>
              {active.map((type) => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className={inlineLayout ? "relative flex min-w-0 flex-col gap-2" : "flex min-w-0 flex-col gap-2"}>
        <Label htmlFor={`${idPrefix}-short-name`}>Nome do projeto</Label>
        <Input id={`${idPrefix}-short-name`} value={shortName} onChange={(event) => onNameChange(event.target.value)} maxLength={80} placeholder="Ex.: Drone Scan" required />
        <p className={inlineLayout ? "truncate text-xs text-muted-foreground xl:absolute xl:top-full xl:mt-2 xl:w-full" : "truncate text-xs text-muted-foreground"} title={preview}>
          Nome final: <span className="font-medium text-foreground">{preview || "—"}</span>
        </p>
      </div>
    </>
  );
}
