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

- Supply orders resolve/store `recipient_user_id` apart from names; RLS grants recipient reads despite renames/name collisions. “Meus com Supply” unions requester/recipient IDs without duplicates; approver/buyer actions stay gated.
- Approval Workflow's three views belong in Supply bottom navigation under Usuários e logs, not top tabs. Supply execution opens `supply`, decisions `mine`; payment approvals stay in Cash Flow, outside Supply execution queues/counts; approval ≠ payment.
- Supply PDFs: lazy PDF.js dialog on mobile, new tab on desktop.
- Payment approvals recognize the active finance role or job title (an inactive legacy title must not block); above the joint-approval threshold, eligible joint approvers join finance and the requester never self-approves.
- Personal approval lists/counts filter by assigned approver, never Admin access, to avoid treating parallel steps as duplicate personal tasks. Admin edits preserve decisions/logs; type changes re-evaluate pending chains; payment allocation uses exclusive destinations.
- Supply “Item novo” authorizes catalog inserts for Fábrica, Terceiros and Ferramentas via effective profile/individual permission and authenticated owner; it does not grant stock editing or movement rights.
- Site Survey completion writes preserve original point/visit timestamps and never time later remediation as field execution; daily completion charts are not rendered because checklist updates are not technical visits.
- Site Survey deletion checks linked OpDesk calls, offers keep/delete, and uses an authorized atomic DB function; OpDesk retains visit number.
- Code images use private ticket attachments: message images stay with replies, standalone images with tickets. Open tickets allow new questions before answers; answers link to pending admin questions, preserving permissions.
- Site Survey actions update/deactivate in place to preserve references; recreating a deleted environment reactivates its row with the selected checklist. Warnings use active visible questions only after explicit save, not autosave; manual visits start `concluida` with historical end.
- Photo drops/pastes autosave; block outside drops. Serialize saves by point/question and flush before switches/closing. Reset stale point selection. Section skips are exclusive, keep answers, remove pending requirements and flush; not-applicable sections stay out of screen summaries.
- Survey report/PDF share ordering and DN from De-Para. Shared prose classifiers distinguish missing location and unverifiable flow; missing flow has no specification. Purchase-report photos come only from the meter-flow question and remain grouped by point. Photo reuse stores same-point attachment ID on response; deletion invalidates it.
- Survey catalog title overrides stay separate from items to preserve fixed keys; material types link by catalog IDs to survive renames. Shop/kiosk catalog sync preserves visit history; inactive exclusion tombstones prevent removed names returning.
- LUC corrections use the history-preserving RPC; shop changes append occupancy history. Reclassification and missing-LUC pendencies use effective type, not storage kind; retain UUIDs, checklists and links. Duplicate LUCs require full-editor confirmation.
- Survey purchase drafts require Supply submission for orders/Approval. Electrical kits use purpose keys and pure eligibility; never visit rows, to keep client reports clean.
- Summary opens numbered questions in the guarded editor; VisitDetails separates execution/management with one registration list. Client PDF uses fresh authorized data, deduplicates calls and serially decodes private facades for its missing-LUC appendix to bound memory.
- Site Survey edit leases renew on visibility return and reacquire atomically before saving after suspension, without overriding another session. Guarded facade writes only update facade progress. Ordinary saves preserve technical dates; explicit completion persists timing, pending fields and warnings.
- Facade uploads (checklist and registration-pending) share a camera/gallery picker excluded from checklist autosave, keeping independent writes safe. Recognition is a time-bounded suggestion whose guards preserve manual names and discard results after the dialog closes, so it never gates point saving.
- Facade attachment triggers only clear facade pending fields; guarded explicit starts and the first nonempty persisted checklist response register point start, excluding retrospective manual visits.
- RLS uses effective menus/app grants; shared files follow record access and uploads bind owners, preserving authorized collaboration. Survey previews lazy-load/cache private images; uploads use lazy compression, a serial queue and retry cache with prepared-file metadata to bound memory.

- Pending cards reuse the guarded editor by section; optional answer.observation stays separate from required details.
- Completed surveys stay out of execution and can never be reopened; History allows authorized registration remediation without changing visit status or technical dates. Section 7 guards customer Q&A; models copy independently.

