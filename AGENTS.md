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
- Supply “Item novo” authorizes catalog inserts for Fábrica, Terceiros and Ferramentas via effective profile/individual permission and authenticated owner; it does not grant stock editing or movement rights.
- Site Survey progress counts completed stores/environments by completion timestamp and user, grouped by São Paulo day/hour, not scheduled visits.
- Site Survey deletion checks linked OpDesk calls, offers keep/delete, and uses an authorized atomic DB function; OpDesk retains visit number.
- Code images use private ticket attachments: message images stay with replies, standalone images with tickets. Open tickets allow new questions before answers; answers link to pending admin questions, preserving permissions.
- Site Survey actions update/deactivate in place to preserve references; warnings use active visible questions only after explicit save, not autosave.
- Manual visits start `concluida` with historical end; checklist autosaves without timing. Shopping points share add dialog, not storage.
- Photo drops/pastes autosave; block outside drops. Serialize saves by point/question; flush before point/section switches.
- Survey skips persist by point; skip removes pending requirements, keeps answers, flushes autosave.
- Survey report/PDF share ordering and hydraulic DN from De-Para; missing flow has no specification. Photo reuse stores same-point attachment ID on response; deletion invalidates it.
