---
description: "Run the decide document comparison workflow"
---

# /decide

Record --decision=accepted|rejected|hold|open for --ref=<comparison> --change=<ordinal> with a factual --note. The source document is not modified. A decision invalidates the previous signoff.

Use the one CLI: `npm run comparisons -- decide`. Options use `--name=value`; add the options named above. Every write needs --actor with the actual operator. Confirm the record and facts before writing.

Present the result with its source record. Never send, delete or share records. Never turn a missing fact into a pass.
