# Project creation RLS regression (2026-09-21)

## Cause

`POST /api/projects` used `insert(...).select().single()`.
The `projects_access_select` policy calls a STABLE helper that re-reads `projects`.
During INSERT RETURNING, that lookup cannot see the new row in the statement snapshot.
An active operator without explicit global finance access therefore received 42501 for all four visibility values.
Testing only a global-finance account missed this: its separate project SELECT policy admitted the new row.

## Fix and security boundary

Generate the UUID on the server, insert with no returned representation, then read that exact UUID in a separate statement.
Both operations use the original authenticated client and existing RLS.
Do not use a service-role client, relax SELECT policies, or grant finance access to fix creation.
The creator remains the verified administrator, regardless of client-supplied IDs.
The existing finance initialization trigger and default lead assignment still run once.
Creating a project alone does not make its creator a finance manager.

If the follow-up read fails, the response identifies the saved project and warns against creating it again.
Project creation and schedule insertion remain separate operations, as before this fix.
An atomic/idempotent create workflow is separate future work, not part of this patch.

## Regression evidence

- The four visibility regression cases fail with the original handler (500 instead of 201) and pass with the fix.
- Unit tests cover success, unauthorized callers, insertion failure, and post-insert read failure.
- `node scripts/test-finance-operator-entry.cjs` runs real Next.js middleware/routes with an isolated HTTP auth/database stub, including desktop/mobile form submission and finance-denial checks.
- The HTTP stub is not proof of database RLS; separate rollback-only tests against the deployed policies verify all four visibilities, schedule insertion, default lead assignment, and no finance access for the unassigned creator.
- Every live probe is rolled back; no test project, financial record, or notification is persisted.
