# Document Comparisons for Claude Code

See what changed, who reviewed it, and what still needs a decision.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install the database and command recipes. | Your document fields, review rules and Draftable change reports mapped across. [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=draftable&utm_medium=readme). | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=draftable&utm_medium=readme). |

For legal and commercial teams comparing agreements, schedules and business documents. Store source versions, compare their text, import Draftable change reports, record review decisions and produce departures papers from a database you own. Claude Code, Codex, OpenCode or Cursor operates it through the same command recipes.

Draftable lists its legal comparison plan at US$261 per user per year, with volume pricing for ten or more users. The selection scenario is fifty list-price seats, not an actual customer invoice. [Pricing and selection evidence](docs/research.md).

## Start with the fictional demo

```bash
git clone https://github.com/Enterprise-DNA-OS/document-comparisons-for-claude-code.git
cd document-comparisons-for-claude-code
npm install
npm run demo
npm run comparisons -- review-queue
npm run comparisons -- changes --ref=CMP-101
npm run comparisons -- redline --ref=CMP-101
npm run docs
npm run view
```

Node 20 or newer. PGlite runs locally in .data/db. Set DATA_DIR for a separate database. Set DATABASE_URL for PostgreSQL 15 or newer. For actual work, migrate a fresh database and import your records; do not seed fictional records into it.

## Compare your own documents

```bash
npm run comparisons -- add --code=DOC-201 --title="Supply agreement" --matter="Supply renewal" --owner="Case owner" --retention-on=2027-06-30 --actor="Operator"
npm run comparisons -- add-version --ref=DOC-201 --label=original --file=original.docx --actor="Operator"
npm run comparisons -- add-version --ref=DOC-201 --label=revised --file=revised.docx --actor="Operator"
npm run comparisons -- compare --ref=DOC-201 --code=CMP-201 --original=original --revised=revised --owner="Case owner" --due-on=2027-01-20 --actor="Operator"
npm run comparisons -- changes --ref=CMP-201 --json
```

Input is UTF-8 text or DOCX. The comparison finds inserted, deleted and replaced text blocks using line differences. It does not interpret legal effect. DOCX extraction drops presentation details: check the source documents for layout, numbering, fields, comments, tracked changes, graphics and other content outside the extracted text. Source versions cannot be overwritten through the CLI. A changed source gets a new version and comparison.

Each source has a SHA-256 file hash and extracted-text hash. Keep the original binary files in your authorised document store. /verify-sources checks the text held in this database, not whether an external original still exists. Inputs are limited to 8 MB and extracted text to 500,000 characters. Comparisons fail explicitly if they exceed the processing budget.

## The weekly jobs

| Recipe | What it answers |
|---|---|
| /review-queue | Which comparisons need a decision and when? |
| /open-changes | Which departures are open or on hold? |
| /high-priority | Which marked changes need close attention? |
| /reviewer-load | Who owns the outstanding work? |
| /stale-reviews | What has not moved for fourteen days? |
| /attention | What is overdue, unchecked or stuck? |
| /weekly-review | Prepare the Monday review from queue, attention and owner load |
| /compliance | Read the retention, confidentiality and scope evidence checks |
| /draft-departures | Draft the changes and decisions for one comparison |
| /draft-review | Draft the Monday review |

31 CLI commands, all with --json, and 35 command recipes including /docs, /view, /customise and /new-view. Run help for the complete list and options. Partial IDs and case-insensitive names work; ambiguity lists candidates and exits with an error. All options use --name=value. Every mutation needs --actor.

## Review before sign-off

/decide records accepted, rejected, hold or open with a reviewer note. These are review decisions only. They never accept or reject edits inside Word or alter the underlying agreement. /tag marks a change as high priority. Notes, source annotations and decision history stay separate.

/review-scope records a human check of both original documents and the extracted comparison, or of the complete unfiltered Draftable report. /review-access records confidentiality evidence and a retention review date. /signoff requires checked scope, no open or held changes, current privacy reviews, and a reviewer different from the assigned owner. Later decisions, scope reviews, assignments and priority changes invalidate prior sign-off. Access reviews invalidate sign-offs for all comparisons of that document. A simple /log note does not approve or invalidate a review.

A sign-off records a review at a particular revision. It does not authorise sending, executing an agreement, or deleting records. Actor names and evidence references are operator-supplied. They are not verified identities or an independent audit. Administrators can change database history.

## Bring Draftable history across

```bash
npm run comparisons -- import draftable --file=changes.csv --source=our-report-bundle --ref=DOC-201 --code=CMP-202 --owner="Case owner" --due-on=2027-01-20 --actor="Operator" --dry-run
npm run comparisons -- import draftable --file=changes.csv --source=our-report-bundle --ref=DOC-201 --code=CMP-202 --owner="Case owner" --due-on=2027-01-20 --actor="Operator"
```

Import the vendor's Changes Report CSV using All changes. Repeating the same source and file is safe. Changed reports get a new comparison code. Tags and notes are preserved as source annotations, not local approvals. Import does not reconstruct the source documents or native redline. [The switching guide](docs/replace-draftable.md) explains headers, mapping and boundaries.

## Ten questions to ask

These are checks this CLI answers now. They are not claims that Draftable cannot be configured to report the same information.

1. Which comparisons are overdue and still have unresolved changes? /review-queue
2. Which high-priority changes have no settled decision? /high-priority
3. Which reviewer has the most outstanding departures? /reviewer-load
4. Which imported reports still need a completeness check? /compliance
5. Which reviews have sat untouched for fourteen days? /stale-reviews
6. Which sign-offs were superseded by a later decision? /signoff-history
7. Which original source versions were used? /source-register
8. Which stored source texts fail their integrity check? /verify-sources
9. Which documents need a retention or confidentiality review? /compliance
10. What changed in the review and who recorded it? /activity

## Your first hour: ten things to ask for

1. Set our business name and colours in brand.json.
2. Show the overdue comparisons.
3. Explain the held payment-term change in the demo.
4. Show the source versions used for CMP-101.
5. Render the text redline for CMP-101.
6. Draft a departures paper with review decisions.
7. Preview a Draftable CSV import.
8. Show which records need a retention review.
9. Add our practice group field with /customise.
10. Add a read-only report for our weekly review with /new-view.

## Paperwork and views

npm run docs writes departures reviews and sign-off records to docs-out/. npm run view writes the week, unresolved departures and assurance reports to views/. /redline writes an escaped HTML text comparison under drafts/. Edit brand.json to use your name, colours and logo. Reports are read-only HTML suitable for printing to PDF. Every output is private until a person decides to share it.

## Running it for a team

The schema has row security enabled and no public access policies. Use a trusted operator database role. This base has no hosted login or tenant isolation. Configure identity, permissions, encrypted storage, backups and recovery tests before shared use. Never upload confidential files to an agent without your firm's approval for that service. Exports contain source text and review notes. The CLI does not send or delete anything. [Compliance checks](docs/compliance.md) and [the interface boundary](docs/why-no-front-end.md) describe the scope.

JSON export preserves every collection and history. CSV export is for spreadsheets and prefixes formula-like cells with an apostrophe. Exports refuse to overwrite files. A JSON export is a portable record dump; use a tested database backup for disaster recovery.

## Validation

npm test migrates and seeds a temporary database, checks every CLI command, real DOCX extraction, change detection, independent review, stale sign-offs, source integrity, idempotent imports, dry-run rollback, CSV mapping, exports, CLI error exits and escaped HTML. It does not use a working DATABASE_URL. TEST_DATABASE_URL must point to an empty disposable database. The GitHub workflow runs Node 20 and 22 on Windows and Linux, plus PostgreSQL 17.

Enterprise DNA builds the agreed web front end, Office connections or a different stack into your version. Omni by Enterprise DNA installs and runs it for one setup fee, then a retainer. Hosting and agent usage have their own costs. [Spend 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=draftable&utm_medium=readme).

MIT. Not affiliated with Draftable, Affinda, Microsoft or Anthropic.
