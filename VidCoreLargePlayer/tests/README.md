# Tests

Run from the repository root:

```powershell
node --check VidCoreLargePlayer/app.js
node VidCoreLargePlayer/tests/storage-startup.test.mjs
```

The storage-startup regression test deliberately runs without IndexedDB. It verifies that the localStorage fallback initializes, list creation succeeds, and case-insensitive duplicate list names are rejected.
