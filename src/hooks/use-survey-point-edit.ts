import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Lease = { editable: boolean; occupied: boolean; editor: string };
const closed: Lease = { editable: false, occupied: false, editor: "" };

export function useSurveyPointEdit(pointId: string, pointKind: string, enabled: boolean, reload: () => Promise<unknown>) {
  const session = useRef<string>("");
  const [state, setState] = useState({ pointId: "", ...closed, checked: false, generation: 0 });
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const editableRef = useRef(false);
  const request = useCallback(async (release = false, acquire = enabled) => {
    if (!session.current) session.current = crypto.randomUUID();
    const { data, error } = await supabase.rpc("survey_point_edit_lease", { _point_id: pointId, _point_kind: pointKind, _session_id: session.current, _release: release, _acquire: acquire });
    if (error) throw error;
    return data as unknown as Lease;
  }, [pointId, pointKind, enabled]);
  useEffect(() => {
    editableRef.current = false;
    setState((old) => ({ pointId, ...closed, checked: false, generation: old.generation }));
    if (!pointId) return;
    let alive = true;
    let running = false;
    const check = async () => {
      if (running) return;
      running = true;
      try {
        const lease = await request();
        if (!alive) return;
        const gained = Boolean(lease.editable) && !editableRef.current;
        if (gained) await reloadRef.current();
        if (!alive) return;
        editableRef.current = Boolean(lease.editable);
        setState((old) => ({ pointId, ...lease, editable: Boolean(lease.editable), checked: true, generation: old.generation + (gained ? 1 : 0) }));
      } catch {
        if (alive) { editableRef.current = false; setState((old) => ({ ...old, ...closed, checked: false })); }
      } finally { running = false; }
    };
    void check();
    const interval = setInterval(() => void check(), 20000);
    const focus = () => void check();
    window.addEventListener("focus", focus);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener("focus", focus);
      // If acquisition was still in flight, release only after that request finishes.
      const release = async () => {
        while (running) await new Promise((resolve) => setTimeout(resolve, 25));
        await request(true).catch(() => undefined);
      };
      void release();
    };
  }, [pointId, request]);
  const ensureEditable = async () => {
    if (!pointId || !editableRef.current) throw new Error("Checklist somente para visualização. A foto da fachada continua liberada.");
    const lease = await request(false, false);
    if (!lease.editable) {
      editableRef.current = false;
      setState((old) => ({ ...old, ...lease, editable: false, checked: true }));
      throw new Error(`Este checklist está sendo editado por ${lease.editor}.`);
    }
  };
  return { ...state, editable: state.pointId === pointId && state.editable, ensureEditable };
}