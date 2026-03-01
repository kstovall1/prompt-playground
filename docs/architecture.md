# Architecture

## What This App Is
Databricks App for testing MLflow 3 Prompt Registry prompts. Browse prompts by catalog/schema, fill template variables, call model serving endpoints, log MLflow traces, run batch evals with LLM-as-judge scoring.

---

## Stack
- **Backend**: FastAPI (uvicorn :8000), Python 3.11, `uv` for deps
- **Frontend**: React + TypeScript + Vite + Tailwind SPA; `dist/` pre-built and committed
- **MLflow**: `mlflow[databricks]>=3.1.0` — all MLflow calls are sync → wrapped in `asyncio.to_thread()` in async routes
- **Auth**: `IS_DATABRICKS_APP` env var → M2M OAuth via `WorkspaceClient()` (deployed) or `WorkspaceClient(profile=...)` (local)

---

## File Map

```
src/
  app.py                        FastAPI app entry point, mounts routes + serves dist/
  server/
    config.py                   Reads env vars, exposes settings
    mlflow_client.py            Prompt CRUD (create/get/list), template parsing
    mlflow_helpers.py           configure_mlflow(), get_mlflow_client(), experiment utils
    templates.py                Template rendering, parse_system_user(), buildXmlTemplate
    llm.py                      call_model() → Databricks model serving endpoint
    evaluation.py               mlflow_genai_evaluate(), score extraction from traces
    warehouse.py                SQL Warehouse queries (list tables, columns, read rows)
    scoring.py                  _resolve_scorers(), QualityScorer wrapper
    routes/
      config.py                 GET /api/config
      models.py                 GET /api/models
      prompts.py                GET/POST /api/prompts, /api/prompts/versions
      run.py                    POST /api/run
      evaluate.py               GET/POST/DELETE /api/eval/*

src/frontend/src/
  App.tsx                       Root state: catalog/schema/experiment/prompt/version/model
  types.ts                      All shared TypeScript types
  hooks/
    useApi.ts                   apiFetch(), useMutation() base helpers
    usePromptApi.ts             usePrompts(), useVersions(), usePromptTemplate()
    useRunApi.ts                useRunPrompt()
    useModelApi.ts              useModels()
    useEvalApi.ts               useJudges(), useJudgeDetail(), useRunEval(), useEvalTables(), etc.
    usePromptEditor.ts          Edit/draft/save state for PromptPreview
  components/
    PromptSelector.tsx          Prompt + version picker with version card list
    PromptPreview.tsx           Chat/Raw toggle; edit mode with system+user textareas
    PromptForm.tsx              Create new prompt slide-over
    VariableInputs.tsx          {{var}} input fields
    ModelSelector.tsx
    RunControls.tsx             Temperature + Run button
    ResponsePanel.tsx           Model response display
    EvaluatePanel.tsx           Full eval config + results layout; TemplatePreview + JudgePreview
    eval/
      JudgeForm.tsx             Create/edit judge slide-over
      EvalResults.tsx           Results table with score badges + guideline checklist
    ConfirmDialog.tsx           Centered modal confirm
    SearchableSelect.tsx        Dropdown with search + option groups
    TabBar.tsx
    Header.tsx
  utils/
    templateUtils.ts            parseSystemUser(), buildXmlTemplate(), parseTemplateVariables()
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Returns env-configured catalog, schema, experiment, warehouse |
| GET | `/api/models` | Lists model serving endpoints |
| GET | `/api/prompts` | Lists prompts in catalog.schema |
| POST | `/api/prompts` | Creates a new prompt |
| GET | `/api/prompts/versions` | Lists versions for a prompt |
| POST | `/api/prompts/versions` | Registers a new version |
| POST | `/api/run` | Runs prompt against model, logs MLflow trace |
| GET | `/api/eval/experiments` | Lists MLflow experiments (filtered by catalog.schema if provided) |
| GET | `/api/eval/experiments/prompts` | Distinct prompt names that have runs in an experiment |
| GET | `/api/eval/tables` | Lists UC tables for eval dataset |
| GET | `/api/eval/columns` | Lists columns for a table |
| GET | `/api/eval/judges` | Lists registered scorers for an experiment |
| GET | `/api/eval/judges/detail` | Gets type + instructions/guidelines for a judge |
| POST | `/api/eval/judges` | Creates/updates a registered judge |
| DELETE | `/api/eval/judges` | Deletes a registered judge |
| POST | `/api/eval/run` | Runs batch eval: model × dataset → mlflow.genai.evaluate() |

---

## Key Patterns

### Prompt Names
Fully qualified: `catalog.schema.name`. All prompt endpoints use query params, not path params.

### Config Flow
`app.yaml` env vars → `GET /api/config` → `useConfig()` in React → App.tsx initializes catalog/schema/experiment state. `catalog` initializes to `''` (race condition guard — `usePrompts` waits for config to load before fetching).

### Async MLflow Pattern
All MLflow SDK calls are synchronous. Wrapped with `asyncio.to_thread()` wherever used in async FastAPI route handlers.

### Auth Pattern
```python
# mlflow_helpers.py / mlflow_client.py
if os.getenv("IS_DATABRICKS_APP"):
    client = WorkspaceClient()      # M2M OAuth, auto from env
else:
    client = WorkspaceClient(profile="DEFAULT")  # local ~/.databrickscfg
```

---

## System/User Prompt Splitting

### Storage Convention
XML string stored in Prompt Registry:
```
<system>
You are a helpful assistant for {{company}}.
</system>

<user>
Help me with: {{topic}}
</user>
```
Backward compatible — plain strings treated as user-only.

### Backend
- `templates.py`: `parse_system_user(str | list[dict]) -> (str|None, str)` handles (1) list[dict] OSS chat format, (2) XML-tagged string, (3) plain string. `_normalize_escapes()` converts literal `\n`/`\t` → actual chars.
- `mlflow_client.py`: `get_prompt_template()` returns `{ system_prompt, raw_template, template (user only), variables }`. `raw_template` = full XML for round-trip edit fidelity.
- `llm.py`: `call_model(prompt, system_prompt=None)` builds `[{role:system}, {role:user}]` when system present.
- `routes/run.py`: logs `system_prompt.txt` as artifact; MLflow span inputs include `system_prompt` + `user_prompt` separately.

### Frontend
- `templateUtils.ts`: `parseSystemUser()` mirrors backend; `buildXmlTemplate(system, user)` returns plain string when no system.
- `usePromptEditor.ts`: `baseTemplate = raw_template ?? template`; `activeTemplate` uses `raw_template` so `parseSystemUser` can extract both parts in preview.

---

## Eval Flow

1. Model called for all rows (concurrent per row)
2. All pre-computed outputs passed to `mlflow.genai.evaluate()` in a thread
3. Scores extracted from `eval_result.result_df` (primary) or MLflow traces (fallback)

### Score Extraction (`evaluation.py`)
- Primary: `_extract_scores_from_result()` reads `result_df`
- Fallback: `_extract_row_scores()` reads from `mlflow.search_traces(run_id=..., return_type="list")` — **must use `return_type="list"`** (default returns DataFrame; iterating gives column names, not rows)
- Guidelines judges: per-rule rationale is in trace assessments, NOT result_df; `{scorer}/value` is aggregate — excluded from per-rule detection

### MLflow Assessment Object
- `assessment.rationale` — top-level `str | None` (read directly)
- `assessment.feedback` — holds score VALUE only (do NOT call `.rationale` on it)

### Judge Type Detection (`routes/evaluate.py`)
Use truthiness check on `guidelines` value (not `hasattr`), checking both `model_dump()` and attribute access — Databricks-created scorers may only serialize to `model_dump()`.

---

## Data Models

### Backend (Pydantic)
- `EvalRowResult`: `{ row_index, variables, rendered_prompt, response, score, score_rationale, score_details: ScoreDetail[] | None }`
- `ScoreDetail`: `{ name, value: float|str|None, rationale: str|None }`
- `EvalResponse`: `{ prompt_name, prompt_version, model_name, dataset, total_rows, results, avg_score, run_id, experiment_url }`

### Frontend (TypeScript — `types.ts`)
- `PromptTemplate`: `{ template, raw_template, system_prompt, variables, ... }`
- `RunResponse`: `{ content, system_prompt, ... }`
- `JudgeDetail`: `{ name, type: 'custom'|'guidelines', instructions, guidelines }`

---

## Privileges Required

```sql
GRANT USE CATALOG ON CATALOG <catalog> TO `<sp-client-id>`;
GRANT USE SCHEMA, CREATE FUNCTION, EXECUTE, MANAGE ON SCHEMA <catalog>.<prompt_schema> TO `<sp-client-id>`;
GRANT USE SCHEMA, SELECT ON SCHEMA <catalog>.<eval_schema> TO `<sp-client-id>`;
```

**Note**: `MANAGE` must be granted explicitly — `ALL PRIVILEGES` does NOT include it.
