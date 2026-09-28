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
- The “Meus com Supply” list unions requester and recipient order IDs on the client after RLS, without duplicating orders; approver and buyer actions remain permission-gated.
- Approval Workflow's three views are selected in the Supply bottom navigation under Usuários e logs, not in a top tab strip, to keep navigation consistent across Supply.
- Mobile Supply attachments render PDFs inside the request dialog with a lazy-loaded PDF.js canvas, because mobile browsers may not display blob PDFs in embedded frames; desktop retains its new-tab behavior.
