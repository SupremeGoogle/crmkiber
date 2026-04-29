# AGENTS.md

## What this repo actually is
- `index.html` is **not HTML**; it is the single Python entrypoint (shebang + stdlib HTTP server) that embeds the entire frontend as a string.
- The app is a local proxy/viewer for CRM leads: browser UI at `/`, API passthrough at `/api/leads?page=N`.

## Run / verify
- Main run command: `python3 index.html` (from repo root).
- macOS helper launcher: `Запустить_CRM.command` (changes to script dir, checks Python, then runs `index.html`).
- Startup behavior is part of expected UX: opens `http://localhost:7788` automatically after ~1.2s.

## High-signal implementation details
- Runtime/config is hardcoded in `CONFIG` inside `index.html` (`base_url`, `company_id`, `api_key`, `app_key`, `page_size`, `port`).
- External CRM call is POST to `.../v2api/{company_id}/lead/index` in `fetch_page()` with both JSON `auth` and `X-Api-Key` / `X-APP-KEY` headers.
- TLS verification is intentionally disabled via global `SSL_CTX` (`CERT_NONE`) for corporate proxy environments; do not "fix" this accidentally without explicit requirement.
- Server binds to `localhost` only (`HTTPServer(("localhost", port), Handler)`).

## Editing constraints for this repo
- Keep it single-file unless explicitly requested otherwise; UI/CSS/JS are intentionally inlined in `HTML_PAGE`.
- If renaming files, preserve the launcher expectation that Python executes `index.html`.
- Treat credentials in `CONFIG` as sensitive: do not duplicate them in docs, logs, or new files.

## Project reality checks
- No dependency manifest, test suite, linter, formatter, CI workflow, or codegen config is present in this repo.
- Verification is manual: run the app, load UI, trigger lead fetch, and confirm `/api/leads` responses.
