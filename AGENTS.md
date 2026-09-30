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

- Supply orders store `recipient_user_id` separately from the display name, resolved against a unique profile identity; RLS grants recipient reads so renamed accounts and shared names do not expose unrelated orders.
- “Meus com Supply” unions requester/recipient IDs after RLS without duplicates; approver/buyer actions stay gated.
- Approval Workflow's three views are selected in the Supply bottom navigation under Usuários e logs, not in a top tab strip, to keep navigation consistent across Supply.
- Mobile Supply PDFs use lazy PDF.js canvas in the dialog; desktop opens a new tab.
- Supply execution links open `supply`; decisions open `mine`. Payment approvals stay in Cash Flow, not Supply execution queues/counts; approval is not payment.
- Supply “Item novo” authorizes catalog inserts for Fábrica, Terceiros and Ferramentas via effective profile/individual permission and authenticated owner; it does not grant stock editing or movement rights.
- Site Survey progress counts completed stores/environments by completion timestamp and user, grouped by São Paulo day/hour, not scheduled visits.
- Site Survey visit deletion inspects linked OpDesk calls before offering keep/delete choices; a permission-checked database function executes both actions atomically, and OpDesk retains the visit number even when the visit is removed.
- Code conversation images reuse the private ticket attachment store: message-linked images stay with their reply, standalone additions stay in the ticket attachments. Open tickets permit follow-up questions before earlier ones are answered, and answers link to a specific pending admin question; this preserves the conversation and its permissions.
- Site Survey question actions update/deactivate in place to preserve call references; pending labels follow active, visible, incomplete questions.
- Manual Site Survey visits use `is_manual_entry`, start in checklist progress, retain autosave/photos and omit live start times, durations and pauses.
