---
description: "Run the import document comparison workflow"
---

# /import

Read docs/replace-draftable.md. Run import draftable with --file, --source, --ref=<document>, --code=<new-comparison>, --owner and --due-on. Run --dry-run first, show the count, then apply the authorised import. Do not infer approval from source tags.

Use the one CLI: `npm run comparisons -- import`. Options use `--name=value`; add the options named above. Every write needs --actor with the actual operator. Confirm the record and facts before writing.

Present the result with its source record. Never send, delete or share records. Never turn a missing fact into a pass.
