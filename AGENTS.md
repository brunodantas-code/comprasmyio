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
- Approval Workflow's three views belong in Supply bottom navigation under Usuários e logs, not top tabs, for consistency.
- Mobile Supply PDFs use lazy PDF.js canvas in the dialog; desktop opens a new tab.
- Supply execution opens `supply`, decisions `mine`; payment approvals stay in Cash Flow, outside Supply execution queues/counts. Approval ≠ payment.
- Payment approvals recognize the active finance role or finance job title; an inactive legacy title must not block requests.
- Payment requests above the configured joint-approval threshold include eligible joint approvers alongside finance; the requester never self-approves.
- Admin Approval type edits keep prior decisions and log the change; pending chains re-evaluate when type changes, while payment allocation uses the standard exclusive destination choices.
- Supply “Item novo” authorizes catalog inserts for Fábrica, Terceiros and Ferramentas via effective profile/individual permission and authenticated owner; it does not grant stock editing or movement rights.
- Site Survey progress counts completed stores/environments by completion timestamp and user, grouped by São Paulo day/hour; hide it for retrospective manual visits, whose checklist completion time is not visit time.
- Site Survey deletion checks linked OpDesk calls, offers keep/delete, and uses an authorized atomic DB function; OpDesk retains visit number.
- Code images use private ticket attachments: message images stay with replies, standalone images with tickets. Open tickets allow new questions before answers; answers link to pending admin questions, preserving permissions.
- Site Survey actions update/deactivate in place to preserve references; warnings use active visible questions only after explicit save, not autosave.
- Manual visits start `concluida` with historical end; checklist autosaves without timing. Shopping points share add dialog, not storage.
- Photo drops/pastes autosave; block outside drops. Serialize saves by point/question; flush before point/section switches and card closing; reset point selection on visit changes to prevent stale editors.
- Survey skips persist by point; skip removes pending requirements, keeps answers, flushes autosave.
- Survey report/PDF share ordering and hydraulic DN from De-Para; missing flow has no specification. Purchase-report photos come only from the meter-flow question and remain grouped by point. Photo reuse stores same-point attachment ID on response; deletion invalidates it.
- Survey LUC corrections replace the current history entry; actual shop changes append a history entry, preserving genuine occupancy changes.
- Survey catalog title overrides stay separate from items to preserve fixed keys; material types link by catalog IDs to survive renames.
- Survey points use UUIDs and shared shop/kiosk storage with `point_type`; optional LUC repeats need confirmation, locations may repeat.
- Shop/kiosk catalog sync preserves visit history; inactive exclusion tombstones prevent removed names returning.
- Site Survey purchase reports hand a review-only draft to Supply; only the normal Supply form submission creates the order and Approval.
- Textual action commands use the shared outlined-green action style, including dialogs; compact add/edit controls use the borderless green icon pattern from Cadastro.
- Survey summary reuses loaded data, checklist order, compact grids and point photos; PDFs stay unchanged. VisitDetails modes and add-only managers separate execution from management without changing writes.
- Site Survey uses database-backed expiring per-point edit leases with guarded writes; facade inserts update only facade progress atomically, preventing concurrent checklist overwrites.
- Facade recognition is an independent, time-bounded suggestion; draft revision and request guards preserve manual names and discard results after the dialog closes, so recognition never gates point saving.
- Checklist and registration-pending facade uploads share a camera/gallery picker marked for exclusion from checklist autosave, keeping independent facade writes safe.
- Facade attachment triggers only clear facade pending fields; guarded explicit starts and the first nonempty persisted checklist response register point start, excluding retrospective manual visits.
- Ordinary saves preserve completion timestamps; explicit completion records time and persists required/installation pending fields, with warnings retained after completion.
- RLS uses effective menus/app grants; shared files follow record access and uploads bind owners, preserving authorized collaboration.

- Survey previews lazy-load/cache private images; uploads use lazy compression, a serial queue and retry cache with prepared-file metadata to bound memory.

- Pending cards group by section ID and reuse the guarded focused editor.
- Question JSON enables optional answer.observation, separate from required details to preserve validation.
