import { useState, type ReactNode } from "react";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErpDisclosureRow } from "@/components/erp-disclosure-row";
import { importedField } from "@/lib/indicadores-import";
import type { IndicadoresData } from "./data";

const screen = "components/indicadores/imported-records.tsx";
type Row = IndicadoresData["imported"][number];
type Col = { key: string; label: string; kind?: "text" | "number" | "textarea" | "datetime" };

const objectOf = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const editsOf = (row: Row) => objectOf(row.edits) as Record<string, string>;
const merged = (row: Row) => ({ ...objectOf(row.data), ...editsOf(row) });
const field = (row: Row, key: string) => {
  const value = merged(row)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
};

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (raw: string) => {
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? raw
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const fromLocalInput = (raw: string) => {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString();
};
const dateTime = (raw: string) => {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("pt-BR");
};
const display = (row: Row, col: Col) => {
  const value = field(row, col.key);
  return col.kind === "datetime" ? dateTime(value) : value;
};

function RecordRow({
  row,
  cols,
  canEdit,
  userId,
  title,
  meta,
  extra,
  resolveUser,
  label,
}: {
  row: Row;
  cols: Col[];
  canEdit: boolean;
  userId: string;
  title: (row: Row) => string;
  meta?: (row: Row) => string | null;
  extra?: (row: Row) => ReactNode;
  resolveUser: (id: string) => string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const start = () => {
    const next: Record<string, string> = {};
    for (const col of cols) next[col.key] = col.kind === "datetime" ? toLocalInput(field(row, col.key)) : field(row, col.key);
    setDraft(next);
    setOpen(true);
    setEditing(true);
  };

  const changed = cols.some((col) => {
    const raw = draft[col.key] ?? "";
    const next = col.kind === "datetime" ? fromLocalInput(raw) : raw;
    return next !== field(row, col.key);
  });

  async function save() {
    const patch: Record<string, string> = {};
    for (const col of cols) {
      const raw = draft[col.key] ?? "";
      const next = col.kind === "datetime" ? fromLocalInput(raw) : raw;
      if (next !== field(row, col.key)) patch[col.key] = next;
    }
    setBusy(true);
    const result = await supabase
      .from("indicadores_import_records")
      .update({ edits: { ...editsOf(row), ...patch }, edited_at: new Date().toISOString(), edited_by: userId })
      .eq("source_table", row.source_table)
      .eq("source_id", row.source_id);
    setBusy(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["indicadores"] });
    setEditing(false);
    toast.success(`${label} atualizado.`);
  }

  const editedAt = typeof row.edited_at === "string" ? row.edited_at : "";

  return (
    <ErpDisclosureRow
      name={title(row)}
      meta={meta ? meta(row) : null}
      label={`${label} de ${title(row)}`}
      screen={screen}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEditing(false);
      }}
      actions={
        canEdit ? (
          <Button
            variant="ghost"
            size="compactIcon"
            className="shrink-0"
            aria-label={`Editar ${label}`}
            title={`Editar ${label}`}
            onClick={start}
          >
            <Pencil />
          </Button>
        ) : null
      }
    >
      {editing ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cols.map((col) => (
              <div key={col.key} className="min-w-0 space-y-1">
                <Label htmlFor={`import-${row.source_table}-${row.source_id}-${col.key}`}>{col.label}</Label>
                {col.kind === "textarea" ? (
                  <Textarea
                    id={`import-${row.source_table}-${row.source_id}-${col.key}`}
                    value={draft[col.key] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [col.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={`import-${row.source_table}-${row.source_id}-${col.key}`}
                    type={col.kind === "datetime" ? "datetime-local" : col.kind === "number" ? "number" : "text"}
                    value={draft[col.key] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [col.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="compactIcon"
              aria-label={`Salvar ${label}`}
              title={`Salvar ${label}`}
              disabled={!changed || busy}
              onClick={() => void save()}
            >
              <Save />
            </Button>
            <Button
              variant="ghost"
              size="compactIcon"
              aria-label={`Cancelar edição de ${label}`}
              title={`Cancelar edição de ${label}`}
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              <X />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
            {cols.map((col) => (
              <div key={col.key} className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground">{col.label}</span>
                <span className="whitespace-pre-wrap text-sm">{display(row, col) || "—"}</span>
              </div>
            ))}
          </div>
          {extra ? extra(row) : null}
          {editedAt ? (
            <p className="text-xs text-muted-foreground">
              Editado por {resolveUser(typeof row.edited_by === "string" ? row.edited_by : "")} em{" "}
              {dateTime(editedAt)}
            </p>
          ) : null}
        </>
      )}
    </ErpDisclosureRow>
  );
}

function Section({
  title,
  description,
  rows,
  empty,
  children,
}: {
  title: string;
  description: string;
  rows: Row[];
  empty: string;
  children: (row: Row) => ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="min-w-0 space-y-1">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <div className="space-y-2">
        {rows.length ? rows.map((row) => <div key={row.source_id}>{children(row)}</div>) : (
          <p className="py-3 text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </section>
  );
}

export function ImportedRecords({
  data,
  canEdit,
  resolveUser,
}: {
  data: IndicadoresData;
  canEdit: boolean;
  resolveUser: (id: string) => string;
}) {
  const rows = (table: string) => data.imported.filter((r) => r.source_table === table);
  const dimensions = rows("dimensions").sort(
    (a, b) => Number(field(a, "sort_order")) - Number(field(b, "sort_order")),
  );
  const members = rows("team_members");
  const meetings = rows("meetings").sort(
    (a, b) => new Date(field(a, "scheduled_at")).getTime() - new Date(field(b, "scheduled_at")).getTime(),
  );
  const memberName = (id: string) =>
    field(members.find((m) => field(m, "id") === id) ?? ({} as Row), "full_name");
  const memberAreas = (member: Row) =>
    rows("team_member_dimensions")
      .filter((link) => field(link, "team_member_id") === field(member, "id"))
      .map((link) =>
        field(dimensions.find((d) => field(d, "id") === field(link, "dimension_id")) ?? ({} as Row), "name"),
      )
      .filter(Boolean)
      .join(" · ");
  const organizer = (meeting: Row) =>
    field(
      rows("profiles").find((p) => field(p, "user_id") === field(meeting, "organizer_id")) ?? ({} as Row),
      "full_name",
    );

  return (
    <div className="space-y-6">
      <Section
        title="Áreas"
        description="Nome e responsável de cada área registrada na origem."
        rows={dimensions}
        empty="Nenhuma área importada."
      >
        {(row) => (
          <RecordRow
            row={row}
            label="Área"
            canEdit={canEdit}
            userId={data.userId}
            resolveUser={resolveUser}
            cols={[
              { key: "name", label: "Nome da área" },
              { key: "manager_name", label: "Responsável" },
            ]}
            title={(r) => field(r, "name")}
            meta={(r) => (field(r, "manager_name") ? `Responsável: ${field(r, "manager_name")}` : null)}
          />
        )}
      </Section>

      <Section
        title="Equipe"
        description="Nome, função e áreas de cada pessoa da equipe."
        rows={members}
        empty="Nenhum membro importado."
      >
        {(row) => (
          <RecordRow
            row={row}
            label="Membro da equipe"
            canEdit={canEdit}
            userId={data.userId}
            resolveUser={resolveUser}
            cols={[
              { key: "full_name", label: "Nome" },
              { key: "role", label: "Função" },
            ]}
            title={(r) => field(r, "full_name")}
            meta={(r) => {
              const parts = [field(r, "role"), memberAreas(r) ? `Áreas: ${memberAreas(r)}` : ""].filter(Boolean);
              return parts.length ? parts.join(" · ") : null;
            }}
          />
        )}
      </Section>

      <Section
        title="Reuniões"
        description="Título, tipo, data, duração, descrição e local de cada reunião."
        rows={meetings}
        empty="Nenhuma reunião importada."
      >
        {(row) => (
          <RecordRow
            row={row}
            label="Reunião"
            canEdit={canEdit}
            userId={data.userId}
            resolveUser={resolveUser}
            cols={[
              { key: "title", label: "Título" },
              { key: "meeting_type", label: "Tipo" },
              { key: "scheduled_at", label: "Data e hora", kind: "datetime" },
              { key: "duration_minutes", label: "Duração (min)", kind: "number" },
              { key: "location", label: "Local" },
              { key: "description", label: "Descrição", kind: "textarea" },
            ]}
            title={(r) => field(r, "title")}
            meta={(r) =>
              `${dateTime(field(r, "scheduled_at"))} · ${field(r, "duration_minutes")} min`
            }
            extra={(r) => (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Organizador: {organizer(r) || "Registrado na origem"}</p>
                {rows("meeting_participants")
                  .filter((p) => field(p, "meeting_id") === field(r, "id"))
                  .map((p) => (
                    <p key={p.source_id}>
                      {memberName(field(p, "user_id")) || "Participante"} ·{" "}
                      {field(p, "status") === "pending" ? "Pendente" : field(p, "status")}
                    </p>
                  ))}
              </div>
            )}
          />
        )}
      </Section>
    </div>
  );
}
