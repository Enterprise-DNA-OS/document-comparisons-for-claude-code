# Document Comparisons for Claude Code

For legal and commercial teams reviewing document changes. The demo business is fictional Harbour Document Review. The operator cares about the right source versions, unresolved departures and the evidence behind each decision. Replace the business identity in brand.json before working with real data.

Read before writing. Use the CLI, never answer from memory. Options use --name=value and all writes require --actor. Actor labels are operator-supplied, not authenticated identities. If a name is ambiguous, show the candidate IDs and obtain the right one.

## The recurring jobs

| Ask | Recipe |
|---|---|
| /review-queue | Read each comparison, owner, deadline and outstanding decision count. |
| /attention | Find overdue comparisons, unchecked scope, stale reviews and unresolved high-priority changes. |
| /open-changes | Read the changes still awaiting a decision, across all comparisons. |
| /high-priority | Read high-priority changes and their current review decisions. |
| /reviewer-load | Count outstanding comparisons, unresolved changes and overdue reviews by owner. |
| /stale-reviews | Read comparisons without a review update for fourteen days. |
| /source-register | Read source filenames, version labels, extraction scope and file hashes. |
| /signoff-history | Show which signoffs refer to the current revision and which are stale. |
| /compliance | Read record checks for retention, confidentiality and comparison scope |
| /activity | Read notes and the ordered activity record. |
| /help | List the commands and their accepted options. |
| /list | Read a collection with --kind=documents|versions|comparisons|changes|decisions|signoffs|activity|import_batches. |
| /show | Read a comparison with --ref |
| /changes | Read the full change text and current decisions for --ref=<comparison>. |
| /add | Add a document with --code, --title, --matter, --owner and --retention-on=YYYY-MM-DD |
| /add-version | Add an immutable source with --ref=<document> --label=<version> --file=<txt-or-docx> |
| /compare | Compare two versions of one document: --ref=<document> --code=<comparison> --original=<label> --revised=<label> --owner=<person> --due-on=YYYY-MM-DD |
| /assign | Change --owner or --due-on for --ref=<comparison> |
| /tag | Mark --change=<ordinal> on --ref=<comparison> with --priority=normal|high |
| /decide | Record --decision=accepted|rejected|hold|open for --ref=<comparison> --change=<ordinal> with a factual --note |
| /review-scope | Use --ref=<comparison> --evidence=<reference> only after a human confirms extraction against both originals, or an unfiltered complete vendor report against its originals |
| /review-access | Record --ref=<document> --evidence=<reference> --retention-on=YYYY-MM-DD after a person checks authorised access and retention purpose |
| /signoff | Read show, changes and compliance first |
| /log | Record a factual --note against --ref=<comparison> |
| /import | Read docs/replace-draftable.md |
| /export | Write a new file with --file=<path> |
| /verify-sources | Check stored source text against its recorded hash |
| /weekly-review | Build the Monday review from review-queue, attention and reviewer-load |
| /draft-departures | Read --ref=<comparison> and its history, then write the departures working paper into drafts |
| /draft-review | Write the weekly review into drafts from the current queue, attention and owner load. |
| /redline | Create a read-only text redline for --ref=<comparison> |
| /docs | Render departures and signoff papers |
| /view | Render the week, departures and assurance reports |
| /customise | Write and test a new migration |
| /new-view | Add a read-only report |

## Rules

Never send, publish or delete. Drafts stay in drafts/. Never claim legal advice, document completeness, or that review decisions edit the source file. Never compare documents from different matters by accident. Read compliance and the extraction boundary before signoff. Only record a signoff on the named reviewer's instruction.

The database is trusted-operator only. Configure authentication, least privilege, backups, encryption and access rules before sharing a hosted instance. There is no tenant-facing access policy. Keep original files in the firm's authorised document store; the database holds extracted text and hashes. Treat exports and reports as confidential.

Use npm test before committing. Apply new migrations with npm run migrate. Keep CLAUDE.md and AGENTS.md together. The same .claude/commands recipes serve Claude Code, Codex, OpenCode and Cursor.

Omni by Enterprise DNA installs and runs the agreed version: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=draftable&utm_medium=repo-instructions
