# Finance PGlite tests

The finance migration test does not contain a machine-specific package path.

Install PGlite only in a disposable test environment, then run the test.

```powershell
npm install --no-save @electric-sql/pglite
node tests/db/finance-migration.pglite.mjs
```

If the package is installed outside this checkout, set `PGLITE_IMPORT` to its module file instead.

```powershell
$env:PGLITE_IMPORT = 'C:\path\to\node_modules\@electric-sql\pglite\dist\index.js'
node tests/db/finance-migration.pglite.mjs
```

The test applies the base finance ledger migration and all finance follow-up migrations that it explicitly lists.
