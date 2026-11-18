- Projects planning uses pm_* tables, with an optional legacy-project link; never rewrite Supply/QR project records.
- Project membership and manager roles are database-authorized; Acessos owns app-wide manager grants.
- Graphlib validates dependency DAGs; scheduling uses project-local dates/calendars and Frappe Gantt loads only in the browser.
- Baselines and logs are immutable snapshots; allocation unit rates are captured values, not retroactively replaced by resource edits.
- Budget modes and itemized account snapshots live on the planning project; CDE selects eligible expense account IDs without writing Cash Flow entries, preserving historical budgets when the selection changes.
- Supply matching uses a narrow authenticated catalog and normalized-name/link guards; planning links existing commercial projects instead of creating or renaming Supply records.
- Team candidate lists include active ERP accounts; membership never grants app access, which remains managed in Acessos.
- Projects appearance is saved in CDE and read as CSS variables; Gantt clips its SVG to the last row, and editor field slots use flex-column gaps so input/select baselines align.
- Phase/project target dates are independent of scheduled task dates; never clamp task starts or CPM finish to the project target period. Only the work calendar and explicit dependencies constrain scheduling; comparisons warn without silently rescheduling tasks. Phase ordering uses an invoker RPC to validate the whole list and update atomically under existing RLS and audit triggers.
- Installation assumptions are project-keyed snapshots; import reads only RLS-visible Survey points, preserves per-discipline difficulty and manual productivity, and never writes Survey records. Effort is quantity/productivity; required headcount rounds up against the project calendar and target end.

- WBS parents stay within their project/phase and are cycle-guarded; dependency offsets model TI/II/TT/IT with signed working-day lag, and CPM uses the same offsets in its backward pass.
- View configuration is project-owned and manager-only; task batch edits use an invoker RPC for atomic RLS/audit-preserving writes. Workload sums identity-bound hours across authorized projects; leveling previews never move started tasks and require confirmation. Baseline effort remains grouped by captured resource unit.

- Task collaboration is task/project-keyed and append-only; database guards bind authors, validate team recipients and serialize single answers. Mentions use recipient-only read acknowledgments; private owner/task files never grant project access. Shared pending rows and the authenticated pending RPC feed Home/Central with deep links.

- Duration entry stores original value/unit separately from whole working-day scheduling; hours use project hours/day, weeks/months/years count calendar intervals against holidays. Gantt date resizing resets entry to days to avoid stale units.
- Gantt rebuilds depend on serialized task/dependency content and editable mode, not caller array/callback identity; disable infinite padding to keep wheel scrolling from rebuilding the chart and destroying numbering portals; task hierarchy lists opt into unframed CDE numbers for descendants and depth-based right indentation.
