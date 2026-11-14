---
description: "Run the verify sources document comparison workflow"
---

# /verify-sources

Check stored source text against its recorded hash. A pass says nothing about the original binary file still held in the document store.

Use the one CLI: `npm run comparisons -- verify-sources`. Options use `--name=value`; add the options named above. Add --json for complete values when human output truncates text.

Present the result with its source record. Never send, delete or share records. Never turn a missing fact into a pass.
