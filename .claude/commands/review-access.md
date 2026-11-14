---
description: "Run the review access document comparison workflow"
---

# /review-access

Record --ref=<document> --evidence=<reference> --retention-on=YYYY-MM-DD after a person checks authorised access and retention purpose. All comparison signoffs for that document become stale.

Use the one CLI: `npm run comparisons -- review-access`. Options use `--name=value`; add the options named above. Every write needs --actor with the actual operator. Confirm the record and facts before writing.

Present the result with its source record. Never send, delete or share records. Never turn a missing fact into a pass.
