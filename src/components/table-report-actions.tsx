import { createContext, useContext, useEffect, useId, useState, useCallback, type ReactNode } from "react";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { mergeTableReports, type TableReport } from "@/lib/table-report";

const ReportContext = createContext<{ reports: Record<string, TableReport>; register: (id: string, report?: TableReport) => void } | null>(null);

export function TableReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Record<string, TableReport>>({});
  const register = useCallback((id: string, report?: TableReport) => setReports(current => {
    const next = { ...current };
    if (report) next[id] = report; else delete next[id];
    return next;
  }), []);
  return <ReportContext.Provider value={{ reports, register }}>{children}</ReportContext.Provider>;
}

export function useRegisterTableReport(report: TableReport) {
  const context = useContext(ReportContext);
  const register = context?.register;
  const id = useId();
  const serialized = JSON.stringify(report);
  useEffect(() => { register?.(id, JSON.parse(serialized)); return () => register?.(id); }, [register, id, serialized]);
}

export function TableReportActions({ title, report }: { title: string; report?: TableReport }) {
  const context = useContext(ReportContext);
  const [busy, setBusy] = useState(false);
  const data = report ?? mergeTableReports(Object.values(context?.reports ?? {}));
  async function download(format: "pdf" | "xlsx") {
    setBusy(true);
    try {
      const { exportTableReport } = await import("@/lib/table-report-download");
      await exportTableReport(title, data, format);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível exportar o relatório."); }
    finally { setBusy(false); }
  }
  return <span className="inline-flex shrink-0 items-center gap-1">
    <Button variant="outline" size="icon" className="h-7 w-7" disabled={busy || !data.rows.length} title={`Exportar ${title} em PDF`} aria-label={`Exportar ${title} em PDF`} onClick={() => download("pdf")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}</Button>
    <Button variant="outline" size="icon" className="h-7 w-7" disabled={busy || !data.rows.length} title={`Exportar ${title} em Excel`} aria-label={`Exportar ${title} em Excel`} onClick={() => download("xlsx")}><FileSpreadsheet className="h-4 w-4" /></Button>
  </span>;
}