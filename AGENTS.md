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
- Mobile Supply PDFs use lazy PDF.js canvas in the dialog; desktop opens a new tab.
- Payment approvals recognize the active finance role or job title (an inactive legacy title must not block); above the joint-approval threshold, eligible joint approvers join finance and the requester never self-approves.
- Personal approval lists/counts filter by assigned approver, never Admin access, to avoid treating parallel steps as duplicate personal tasks. Admin edits preserve decisions/logs; type changes re-evaluate pending chains; payment allocation uses exclusive destinations.
- Supply “Item novo” authorizes catalog inserts for Fábrica, Terceiros and Ferramentas via effective profile/individual permission and authenticated owner; it does not grant stock editing or movement rights.
- Survey progress groups point completions by timestamp/user and São Paulo day/hour; hide for retrospective visits because checklist time is not visit time.
- Site Survey deletion checks linked OpDesk calls, offers keep/delete, and uses an authorized atomic DB function; OpDesk retains visit number.
- Code images use private ticket attachments: message images stay with replies, standalone images with tickets. Open tickets allow new questions before answers; answers link to pending admin questions, preserving permissions.
- Site Survey actions update/deactivate in place to preserve references; warnings use active visible questions only after explicit save, not autosave. Manual visits start `concluida` with historical end, autosave without timing; shopping points share the add dialog, not storage.
- Photo drops/pastes autosave; block outside drops. Serialize saves by point/question; flush before point/section switches and card closing; reset point selection on visit changes to prevent stale editors. Skips persist by point, remove pending requirements, keep answers, flush autosave.
- Survey report/PDF share ordering and hydraulic DN from De-Para; missing flow has no specification. Purchase-report photos come only from the meter-flow question and remain grouped by point. Photo reuse stores same-point attachment ID on response; deletion invalidates it.
- Survey catalog title overrides stay separate from items to preserve fixed keys; material types link by catalog IDs to survive renames. Shop/kiosk catalog sync preserves visit history; inactive exclusion tombstones prevent removed names returning.
- LUC corrections replace current history; actual shop changes append to preserve occupancy history. Reclassification uses effective type, not storage kind; retain UUIDs, checklists and links; LUC repeats need confirmation.
- Site Survey purchase reports hand a review-only draft to Supply; only the normal Supply form submission creates the order and Approval.
- Survey summary reuses loaded data, checklist order, compact grids and point photos; PDFs stay unchanged. VisitDetails modes and add-only managers separate execution from management without changing writes.
- Site Survey uses database-backed expiring per-point edit leases with guarded writes; facade inserts update only facade progress atomically, preventing concurrent checklist overwrites. Ordinary saves preserve completion timestamps; explicit completion records time and persists required/installation pending fields, warnings retained.
- Facade uploads (checklist and registration-pending) share a camera/gallery picker excluded from checklist autosave, keeping independent writes safe. Recognition is a time-bounded suggestion whose guards preserve manual names and discard results after the dialog closes, so it never gates point saving.
- Facade attachment triggers only clear facade pending fields; guarded explicit starts and the first nonempty persisted checklist response register point start, excluding retrospective manual visits.
- RLS uses effective menus/app grants; shared files follow record access and uploads bind owners, preserving authorized collaboration. Survey previews lazy-load/cache private images; uploads use lazy compression, a serial queue and retry cache with prepared-file metadata to bound memory.

- Pending cards reuse the guarded editor by section; optional answer.observation stays separate from required details.
- Checklist categories map legacy types without rewriting unchanged storage, preserving boolean conditions; customer questions use answer.customer_questions plus a compatible value and the existing guarded autosave, shared by editor, summary and reports.
