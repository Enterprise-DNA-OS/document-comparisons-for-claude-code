---
description: "Run the review scope document comparison workflow"
---

# /review-scope

Use --ref=<comparison> --evidence=<reference> only after a human confirms extraction against both originals, or an unfiltered complete vendor report against its originals. Never infer completeness from a filename.

Use the one CLI: `npm run comparisons -- review-scope`. Options use `--name=value`; add the options named above. Every write needs --actor with the actual operator. Confirm the record and facts before writing.

Present the result with its source record. Never send, delete or share records. Never turn a missing fact into a pass.
