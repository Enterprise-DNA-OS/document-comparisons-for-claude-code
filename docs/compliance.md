# Evidence checks for document review

These checks flag missing records. They do not certify compliance or give legal advice. Sources checked 14 November 2026.

| Rule | Source and requirement | Implemented check |
|---|---|---|
| NZ-IPP9 | [NZ Privacy Commissioner, Principle 9](https://www.privacy.org.nz/privacy-principles/9/): personal information should not outlast its lawful purpose. | A missing or due retention review date creates a finding. The firm sets the date based on its purposes and obligations; no automatic deletion. |
| NZ-LCCR8 | [Lawyers: Conduct and Client Care Rules, chapter 8](https://www.legislation.govt.nz/regulation/public/2008/0214/latest/whole.html): protect client information in confidence. | Confidential documents need recorded access-review evidence within the past 90 days. Ninety days is a configurable local review policy, not a statutory deadline. |
| LOCAL-SCOPE | Local comparison policy, informed by the [vendor's filtered/full export controls](https://draftable.zendesk.com/hc/en-us/articles/32514479509785-Using-the-Redline-Change-List-to-review-filter-tag-add-notes-and-export-your-changes). | Scope evidence is required for every comparison. A reviewer checks extraction against the originals or confirms an unfiltered export. |
| LOCAL-REVIEW | Local review policy, not a legal standard. | Open and held changes block sign-off. A different named reviewer signs the current revision. Later changes invalidate it. |

/compliance returns findings. /review-access and /review-scope record the human evidence behind the checks. /verify-sources checks stored extracted text hashes. It does not validate the original binary file or prove that extraction included every relevant feature.

A dated access note is not technical access enforcement. Use restricted database credentials, controlled file storage, approved agent services and real authentication for shared deployment. The base is for trusted operators. Its actor names are entered by operators and are not identity verification. Database administrators can alter records. Configure your own AU or other jurisdiction rules with qualified advice before applying these checks there.
