# Bring Draftable change reports across

Export the Changes Report as CSV with All changes selected. Keep both original documents and the native redline beside the export in your firm's authorised document store. The vendor's [change-list guide](https://draftable.zendesk.com/hc/en-us/articles/32514479509785-Using-the-Redline-Change-List-to-review-filter-tag-add-notes-and-export-your-changes) documents this export and shows its headings. Checked 14 November 2026.

1. Save one complete report per comparison. A filtered report omits changes; the importer cannot detect omissions.
2. Create the document record with add, including its matter and owner.
3. Run import draftable with --file, --source, --ref, --code, --owner, --due-on and --actor. Add --dry-run first to validate the file without keeping records.
4. Check the imported count, change numbers, tags, notes and text against Draftable. Keep source tags separate from your new decisions.
5. Have the reviewer record scope evidence. Work through the unresolved changes before independent sign-off. Compare outputs on representative documents before replacing your existing process.

Example:

```bash
npm run comparisons -- import draftable --file=changes.csv --source=renewal-report-1 --ref=DOC-101 --code=IMPORT-101 --owner="Mara Chen" --due-on=2027-01-20 --actor="Migration owner" --dry-run
```

Remove --dry-run to apply the same command. A second import with the same source label and file hash returns the original count without duplicating changes. Reusing that source/file for another document or comparison is rejected. For a changed report, use a new comparison code. Old decisions remain attached to the old comparison.

| Vendor column | Stored as |
|---|---|
| No. | Change ordinal, positive and unique within the comparison |
| Page | Source location |
| Change Type | Vendor's description, unchanged |
| Content Type | Preserved in source_data |
| Tag | Source annotation; High Priority also sets local priority |
| Notes | Original source note |
| Text | Vendor's change description, not parsed into original/revised wording |

The vendor's published screenshot is the basis of fixtures/draftable.csv. Fixture content is fictional. The default header names require No., Change Type and Text. Optional source fields are retained when present. All fields are preserved in source_data. If your version has different headings, pass --map=map.json, for example:

```json
{"number":"Change number","page":"Location","kind":"Type","text":"Description","note":"Review Notes"}
```

Permitted mapping keys: number, page, kind, content, tag, note, text. Import rejects malformed rows, duplicate headers and repeated change numbers and rolls back the whole operation on error. It accepts UTF-8, quoted multiline fields, BOM and CRLF.

This imports comparison history, not a Draftable workspace. Original binary files, tracked-change markup, formatting, pictures, Office integrations and comparison settings do not come through this CSV. There is no invented before/after interpretation of the vendor's prose. Bring the two source files in with add-version and run compare to produce a separate local text comparison. DOCX extraction still needs a human check against the originals.

A one-command import moves a supported complete report. Migration validation and a replacement for a firm's native Office review process take separate work. Enterprise DNA scopes that work around real sample documents.
