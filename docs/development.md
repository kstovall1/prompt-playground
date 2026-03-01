# Development

## Local Dev Server

```bash
cd /Users/katie.stovall/Documents/Dev_Projects/prompt-playground/src && \
PROMPT_CATALOG=hinge_prompt_app PROMPT_SCHEMA=prompts EVAL_SCHEMA=eval_data \
MLFLOW_EXPERIMENT_NAME=/Shared/prompt-playground-evaluation \
SQL_WAREHOUSE_ID=4b9b953939869799 \
uv run --no-project --python 3.11 \
  --with "fastapi>=0.115.0,uvicorn[standard]>=0.30.0,aiohttp>=3.9.0,databricks-sdk>=0.30.0,pydantic>=2.0.0,mlflow[databricks]>=3.1.0,python-multipart>=0.0.9,requests" \
  uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Workspace: `e2-demo-field-eng.cloud.databricks.com` (DEFAULT profile)
Warehouse: `4b9b953939869799`

## Rebuild Frontend

```bash
cd src/frontend && npm run build
```

`dist/` is pre-built and committed. Rebuild only needed after frontend changes.

## Running Tests

```bash
uv run --no-project --python 3.11 \
  --with "fastapi>=0.115.0,httpx>=0.27.0,pytest,mlflow[databricks]>=3.1.0,databricks-sdk>=0.30.0,pydantic>=2.0.0,aiohttp>=3.9.0,uvicorn,requests" \
  pytest tests/ -v --ignore=tests/test_template_rendering.py
```

- `tests/test_template_rendering.py` — broken pre-existing, always ignore
- `tests/test_judge_config.py` — 26 tests for judge name validation (uses old strict regex — update before merging `feature/judge-ux-improvements`)
- ~51 tests total pass

---

## Deployed App (e2-demo)

- **DAB path**: `/Users/katie.stovall/Documents/TESTING/prompt-playground/`
- **App URL**: https://prompt-playground-1444828305810485.aws.databricksapps.com
- **Profile**: DEFAULT → e2-demo-field-eng.cloud.databricks.com
- **Warehouse**: `"Shared Unity Catalog Serverless"` (ID `4b9b953939869799`)
- **Catalog/Schema**: `hinge_prompt_app` / `prompts` / `eval_data`

### Test Data in `hinge_prompt_app`

**Prompts** (`hinge_prompt_app.prompts`):
- `hinge_profile_bio_coach` — v6 has system/user XML split; v1–5 are plain string
- `hinge_bio_coach_sys_user` — system = persona + response format; user = `{{prompt_question}}`, `{{current_answer}}`, `{{tone}}`

**Eval tables** (`hinge_prompt_app.eval_data`):
- `bio_coach_eval` — 3 rows; columns: `row_id`, `prompt_question`, `current_answer`, `tone`
- `bio_coach_sys_user_eval` — 10 rows, same columns
- `compatibility_eval`, `icebreaker_eval` — original eval tables

---

## Git / GitHub

- **GitHub**: https://github.com/kstovall1/prompt-playground (personal account `kstovall1`)
- SSH key belongs to `katie-stovall_data` — push via HTTPS with token:
  ```bash
  git remote set-url origin "https://kstovall1:$(gh auth token --user kstovall1)@github.com/kstovall1/prompt-playground.git"
  # reset after push
  git remote set-url origin git@github.com:kstovall1/prompt-playground.git
  ```

### Branches
| Branch | Status | Notes |
|--------|--------|-------|
| `main` | remote + local | UI bug fixes merged 2026-02-28 |
| `feature/system-user-prompt-splitting` | remote + local | sys/user XML split; rebased on main (clean fast-forward when merging) |
| `feature/judge-ux-improvements` | local only | relaxed name validation, Add variable button, eval table error UI |
| `feature/ui-updates` | remote + local | merged to main, kept for reference |

### Pending Merges
- `feature/judge-ux-improvements` → `main`: update `test_judge_config.py` name validation tests first
- `feature/system-user-prompt-splitting` → `main`: clean fast-forward, ready when shipping

### Branch Tips
- Always `git stash` before switching branches
- `dist/` conflicts: safe to resolve with `--theirs` or `--ours` — rebuild after switching
- `dist/` sometimes blocked by `.gitignore`: use `git add -f`

---

## Gotchas

1. **`MANAGE` privilege**: Must be granted explicitly — `ALL PRIVILEGES` does NOT include it. Routes return 403 with actionable GRANT instructions.
2. **Temperature errors**: Some models (e.g. `databricks-gpt-5-mini`) reject temperature ≠ 1.0. `llm.py` detects and surfaces user-friendly error.
3. **MLflow `search_traces`**: Must use `return_type="list"` — default returns DataFrame; iterating gives column names, not rows.
4. **Experiments filtered by catalog/schema**: `search_runs` batched in chunks of 100 (MLflow API limit).
