---
name: Workspace tooling
description: Formatting and linting scope for this Replit workspace
---

Repository-wide formatter and lint commands can traverse Replit's generated dependency cache, producing noisy unrelated diagnostics or timing out.

**Why:** The workspace contains a large `.cache` tree alongside the application source, so broad checks are not a reliable signal for changed code.

**How to apply:** Run format and lint checks against the changed source files or the `src` tree, and separately use TypeScript and the production build for whole-app validation.