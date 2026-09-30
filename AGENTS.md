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
- Site Survey question actions update/deactivate in place to preserve call references; pending labels follow active, visible, incomplete questions.
- Manual visits start `concluida` with historical end; checklist autosaves without timing. Shopping points share add dialog, not storage.
- Photo drops/pastes populate file inputs for autosave; block outside drops to prevent lost edits.
- Site Survey skips persist per store/environment; skip removes pending/completion requirements, preserves answers, and flushes autosave first.
- Site Survey report preview/PDF share ordering and hydraulic DN from active De-Para by flow; missing flow shows no specification.
