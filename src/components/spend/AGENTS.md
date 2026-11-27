- Spend uses identity-scoped RPCs and private card/advance-keyed storage so holders cannot access another holder's receipts or finance decisions.
- Receipt edits reuse capture and the owner-guarded locked RPC; approved records remain immutable and previous file paths stay audited.
- Receipt cleanup is deterministic browser image processing, never generative reconstruction, to preserve fiscal text.
- Capture and receipt viewing share a browser-loaded PDF.js preview with private/local URLs, preserving original files and showing all pages without embedded cross-origin frames.
- Receipt location is reviewable and nullable; derive UF only from a validated NF-e/NFC-e key and city only from printed merchant address, preserving approved records.
- City suggestions query the public IBGE municipalities endpoint scoped and cached by UF; never include other-state suggestions or overwrite OCR/manual values when changing UF, and preserve manual entry on provider failure.
- Capture confirmation labels explicitly target unique checkbox IDs with mobile-sized label touch areas; all data edits invalidate confirmation before saving.
- Aa choices persist through the shared presentation hook without changing stored bank descriptions.
- Capture uses a scoped mobile touch-target stylesheet and a separate desktop shared ghost Button so field ergonomics do not alter other CDE actions.
- Supplier De-Para is finance-RLS-managed; exact normalized names fill only empty line accounts via an audited trigger, never bypassing receipt/approval guards or replacing manual classifications.
- Approvals lock statement rows and create one uniquely linked Finance payable atomically to prevent duplicate posting.
- Category keys and original validations stay stable; custom categories use immutable IDs and CDE deletion tombstones, shared by capture and authenticated receipt validation to preserve history.
- Multimodal extraction runs only in authenticated server functions; normalized results remain reviewable before statement persistence.
- Approval keyboard eligibility is a pure tested helper; the audit view ignores repeats and editing contexts before dispatching the same guarded approval action.
- Description case conversion is display-only and shared by reconciliation/import preview; retain bank originals in writes, exports and audit.
- Reconciliation keeps line editors mounted while collapsed, limits Enter approval to the expanded line, and renders private statement PDFs with browser-loaded PDF.js to preserve drafts and support scrolling on mobile.
- Bulk classification uses one finance-authorized, statement-scoped atomic RPC after confirmation; receipt waiver is persisted and audited, never inferred from merchant text or a caller's approval payload.
- Payment source is independent of private card storage scope; matching helpers and locked RPCs exclude reimbursements, while pre-approval source corrections detach statement links with audit to prevent card posting.
- Reimbursements hand off owner-verified IDs to Supply; photos stage privately before the existing request insert atomically locks and links receipts, preserving canonical values and blocking duplicate submission without changing approval chains.
- Due-month PDF selection and card-scoped competence filters stay independent; cross-statement viewing preserves stored dates and statement-scoped bulk classification guards.
- Due-date filtering uses separate month and year droplists that recompose the stored YYYY-MM period, so the two lists never diverge from the invoice the reconciliation shows.
- Project review is shared by save, Enter and batch approval; guarded RPCs recheck receipt/project snapshots under lock and audit both sources, while line-ID editor keys preserve unsaved finance drafts across receipt links and cancellations never post unreviewed lines.
- Receipt evidence is server-written and bound to immutable storage object/hash; shared verification gates capture, manual/automatic matching and individual/Enter/batch approvals, so client-supplied bank values cannot conceal a wrong image and approved history stays intact.- Temporary card authorizations are holder-granted, dated (≤90 days) and revocable; delegates may only create new card receipts on that card and see only their own uploads, never statements or other receipts, preserving submitter identity in submitted_by.

- Missing-receipt responses use a holder-only locked RPC tied to the exact adjustment timestamp; they resolve personal/Admin alerts through audit, never set finance waiver or approve lines.
- The holder may only declare that the receipt was lost or not saved; "Não se aplica" stays a Finance classification recorded in Conciliação, so stored answers of that older kind remain readable but can no longer be submitted.
- Notification and adjustment sends are evidenced from audited line-scoped logs and rendered with the shared MilestoneTimeline; send indicators never imply read or approval.
- Receipt-card presentation exceptions stay in the shared display helper; finance reconciliation retains canonical cards and existing records/permissions remain untouched.
- Expense advances are Finance/Admin-created via the guarded spend_advance RPC; advance receipts (payment_source='advance') have no card link, use advance-keyed private storage, are balance-locked by trigger, never reach Supply or card statements, and closing requires approved receipts plus an audited balance resolution. Overdue open balances create holder pendencies in personal/Admin Central and the Spend badge.
- Receipt rows keep a fixed action slot (invisible placeholder when edit is unavailable) so amounts stay right-aligned.
- Personal reimbursements stay listed for their holder in Meus comprovantes even when their storage card is inactive or not selected; card filtering never hides them.
- Reimbursement receipts may carry no card at all: files live under reimbursement/<user>/<YYYY-MM>/..., extraction evidence stores no card, and the table check allows reimbursement with or without card while myio_card always keeps one.
- Expenses without a fiscal receipt set spend_receipts.without_receipt with a no-receipt/<id> placeholder path; only Reembolso/Adiantamento, reason required in observation, OCR/evidence guards skipped and Supply orders need no attachment for them.
- Expense category configuration lives in the Spend menu, retaining cde_selected storage and ERP-admin-only writes; moving its UI never grants finance users CDE management.

- Reconciliation PDF and lines share subgrid header tracks so tools and wrapping keep their reading surfaces aligned; totals and competence retain their existing calculations and filters.

- Camera and document pickers are separate entry points into the same capture flow; PDF originals and image cleanup retain existing private storage and evidence validation.

- Desktop receipt entry opens the document picker; receipt pickers include explicit extensions plus MIME types, while the mobile camera remains image-only.

- Statement description edits use line-locked Finance RPC log revisions resolved separately from bank originals, preserving evidence, classifications, concurrent drafts and immutable approvals.

- Spend classification shares synchronized code/name selectors for one canonical account ID; filters and sorting split presentation labels, and fullscreen keeps editors mounted to preserve drafts.
