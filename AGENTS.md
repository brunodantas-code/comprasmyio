<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Supply uses recipient IDs, not names; RLS preserves recipient reads. Personal queues union requester/recipient IDs without duplicates; actions stay gated.
- Supply allocation uses a shared exclusive selector and resolver; purchase-order triggers derive project-owned client/unit IDs and reject conflicting direct allocations, so client consolidation counts each order once while preserving independent cost centers.
- Approval views stay under Supply bottom navigation. Execution opens `supply`, decisions `mine`; payment approvals stay in Cash Flow, outside Supply execution/counts.
- Supply PDF: mobile PDF.js; desktop tab.
- Payment approvals recognize the active finance role or job title (an inactive legacy title must not block); above the joint-approval threshold, eligible joint approvers join finance and the requester never self-approves.
- Personal approval lists/counts use assigned approver, not Admin access, avoiding duplicate parallel tasks. Admin edits preserve decisions/logs; type changes re-evaluate pending chains; payment allocation uses exclusive destinations.
- Supply “Item novo” authorizes catalog inserts for Fábrica, Terceiros and Ferramentas via effective profile/individual permission and authenticated owner; it does not grant stock editing or movement rights.
- Survey completion preserves technical timestamps; remediation is not execution. No daily completion charts.
- Survey deletion atomically checks OpDesk links and offers keep/delete; OpDesk retains visit number.
- Code images use private ticket attachments: message images stay with replies, standalone images with tickets. Open tickets allow new questions before answers; answers link to the other participant's pending question. Reply access is independent of new-question access so attended tickets remain answerable until closed or deleted.
- Code observations use append-only ticket-log revisions through an admin-authorized RPC, while proposed solutions are separately guarded and audited; this preserves original notes and every edit without widening ticket permissions.
- Site Survey actions update/deactivate in place to preserve references; recreating a deleted environment reactivates its row with the selected checklist. Warnings use active visible questions only after explicit save, not autosave; manual visits start `concluida` with historical end.
- Photo drops/pastes autosave; block outside drops. Serialize saves by point/question and flush before switches/closing. Reset stale point selection. Section skips are exclusive, keep answers, remove pending requirements and flush; not-applicable sections stay out of screen summaries.
- Survey report/PDF share ordering and DN from De-Para. Shared prose classifiers distinguish missing location and unverifiable flow; missing flow has no specification. Purchase-report photos come only from the meter-flow question and remain grouped by point. Photo reuse stores same-point attachment ID on response; deletion invalidates it.
- Survey catalog title overrides stay separate from items to preserve fixed keys; material types link by catalog IDs to survive renames. Shop/kiosk catalog sync preserves visit history; inactive exclusion tombstones prevent removed names returning.
- LUC corrections use the history-preserving RPC; shop changes append occupancy history. Reclassification and missing-LUC pendencies use effective type, not storage kind; retain UUIDs, checklists and links. Duplicate LUCs require full-editor confirmation.
- Survey drafts require Supply submission. Purpose-keyed kits preserve individual items with shared point lists. Installation scope is visit/point-keyed in separate RLS tables, editor-only and audited; it never writes technical timing. Purchases use discipline approvals; meter kits follow hydraulic approval.
- Summary uses numbered guarded editors and one registration list. Client PDF reads authorized fresh data, deduplicates calls and serially decodes facades. Environment location is stored independently of templates to preserve physical location.
- Survey leases renew on visibility return and atomically reacquire before saving, without overriding peers. Facade writes affect facade progress only; ordinary saves preserve dates and completion saves timing/pendencies.
- Facade pickers bypass checklist autosave. Bounded recognition preserves manual names, discards closed-dialog results and never gates saving.
- Facade attachment triggers only clear facade pending fields; guarded explicit starts and the first nonempty persisted checklist response register point start, excluding retrospective manual visits.
- RLS uses effective menus/app grants; shared files follow record access and uploads bind owners, preserving authorized collaboration. Survey previews lazy-load/cache private images; uploads use lazy compression, a serial queue and retry cache with prepared-file metadata to bound memory.

- Pending cards reuse the guarded editor by section; optional answer.observation stays separate from required details.
- Completed surveys never reopen; History remediation preserves status/dates. Customer Q&A resolves stored, point then visit-template Section 7 independently of pending groups; history includes original customer-question sections after template switches, preserving questions and replies for all point types. Models copy independently.
- Registration lists/PDF/Excel share a pure checklist matcher and filtered rows with fresh authorized approvals; PDF uses pdf-lib AcroForm and Excel OOXML controls, independent of ERP data.
- Proposals use private visit-keyed files; authenticated extraction syncs totals by trigger and stores group breakdown in proposal metadata. Environment remainders preserve unknown quantities as null.

