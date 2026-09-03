---
name: MongoDB organization
description: Motoluxe database naming and index compatibility constraints.
---

All Motoluxe server persistence should use the single `motoluxe` database and the shared collection map rather than deriving a database name independently in each service.

**Why:** Separate clients and URI-derived database names made Atlas data appear scattered, while an Atlas partial unique index using `$exists: false` was rejected by the connected server.

**How to apply:** Keep active-customer uniqueness enforced by server validation plus a normal phone index; avoid partial indexes with `$exists: false` unless the target MongoDB deployment explicitly supports them.