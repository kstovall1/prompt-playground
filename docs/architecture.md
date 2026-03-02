# Architecture

## What This App Is
Databricks App for testing MLflow 3 Prompt Registry prompts. Browse prompts by catalog/schema, fill template variables, call model serving endpoints, log MLflow traces, run batch evals with LLM-as-judge scoring.

---

## Stack
- **Backend**: FastAPI (uvicorn :8000), Python 3.11, `uv` for deps
- **Frontend**: React + TypeScript + Vite + Tailwind SPA; `dist/` pre-built and committed
- **MLflow**: `mlflow[databricks]>=3.1.0` — all MLflow SDK calls are sync → wrapped in `asyncio.to_thread()` in async routes
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
    templates.py                parse_template_variables(), render_template()
    llm.py                      list_serving_endpoints(), call_model() → Databricks model serving
    evaluation.py               mlflow_genai_evaluate(), score extraction from result_df + traces
    warehouse.py                SQL Warehouse queries (list tables, columns, read rows)
    scoring.py                  QualityScorer (default LLM judge), score_response_sync()
    routes/
      config.py                 GET /api/config
      models.py                 GET /api/models
      prompts.py                GET/POST /api/prompts, /api/prompts/versions
      run.py                    POST /api/run, POST /api/preview
      evaluate.py               GET/POST/DELETE /api/eval/*

src/frontend/src/
  App.tsx                       Root state: catalog/schema/experiment/prompt/version/model; 3-tab layout
  types.ts                      All shared TypeScript types
  hooks/
    useApi.ts                   apiFetch(), useMutation() base helpers
    usePromptApi.ts             usePrompts(), useVersions(), usePromptTemplate()
    useRunApi.ts                useRunPrompt()
    useModelApi.ts              useModels()
    useEvalApi.ts               useJudges(), useJudgeDetail(), useRunEval(), useEvalTables(), etc.
    usePromptEditor.ts          Edit/draft/save state for PromptPreview
  components/
    PromptSelector.tsx          Prompt dropdown + version card list (flex-grow, fills panel height)
    PromptPreview.tsx           Preview and edit mode — rendered in both Prompts and Playground tabs
    PromptForm.tsx              Create new prompt slide-over
    VariableInputs.tsx          {{var}} input fields
    ModelSelector.tsx
    RunControls.tsx             Run button + reset (clears response + variable values) + unfilled-var warning
    ResponsePanel.tsx           Model response display
    TemplatePreview.tsx         Collapsible prompt preview; strips &lt;system&gt;/&lt;user&gt; XML tags by default; Raw toggle shows full template
    EvaluatePanel.tsx           Full eval config + results layout; TemplatePreview + JudgePreview; reset clears result + column mapping
    eval/
      JudgeForm.tsx             Create/edit judge slide-over
      EvalResults.tsx           Results table with score badges + guideline checklist
    ConfirmDialog.tsx           Centered modal confirm
    SearchableSelect.tsx        Dropdown with search + option groups
    TabBar.tsx                  Tab type: 'prompts' | 'playground' | 'evaluate' | 'howto'
    Header.tsx
  utils/
    templateUtils.ts            parseTemplateVariables()
```

---

## UI Layout

3-tab layout (initial tab: `prompts`). All tabs always mounted; toggled with `hidden` CSS class so state is preserved across switches.

### Prompts Tab — browse, manage, edit
```
Left panel (flex col):
  Fixed top (flex-shrink-0, border-b):
    Prompt Registry — catalog.schema inputs
    Experiment — selector + filter-by-experiment checkbox
  Flex middle (flex-1 overflow-hidden):
    PromptSelector — prompt dropdown (fixed) + version card list (fills height)
  Sticky footer:
    "Test in Playground →" button (disabled until prompt+version selected)

Right panel (flex-1):
  PromptPreview — full height, full edit/save capability
```

### Playground Tab — fill variables, run, iterate
```
Left panel (flex col):
  Scrollable:
    Loaded prompt indicator — name + version + "Change →" link to Prompts tab
    VariableInputs — shown when template has variables
    ModelSelector
  Sticky footer:
    RunControls — Run button + reset (clears response + variables) + unfilled-var warning

Right panel (flex col):
  Top (h-2/5 or h-3/5 when editing):
    PromptPreview — same editor as Prompts tab (shared App.tsx state)
  Bottom (flex-1):
    ResponsePanel
```

**Note**: `PromptPreview` renders in both Prompts and Playground tabs with identical props. Editing in one tab reflects in the other because both read from App.tsx state (`usePromptEditor`). Only one is visible at a time.

### Evaluate Tab — batch eval
```
Left panel (scrollable, 3 sections divided by <hr>):
  1. Eval Dataset — catalog.schema + table selector + max rows slider
  2. Experiment + Prompt — experiment picker + filter + prompt + version + TemplatePreview
  3. Judge — scorer picker + sub-configs
  4. Run Config — model endpoint + variable→column mapping (Auto button name-matches; Clear button resets)
  Sticky footer: Run Evaluation button

Right panel:
  DatasetTable (preview + results) or empty state
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
| POST | `/api/preview` | Renders prompt with variables, no model call |
| GET | `/api/eval/experiments` | Lists MLflow experiments (filtered by catalog.schema if provided) |
| GET | `/api/eval/experiments/prompts` | Distinct prompt names that have runs in an experiment |
| GET | `/api/eval/tables` | Lists UC tables for eval dataset |
| GET | `/api/eval/columns` | Lists columns for a table |
| GET | `/api/eval/judges` | Lists registered scorers for an experiment |
| GET | `/api/eval/judges/detail` | Gets type + instructions/guidelines for a judge |
| POST | `/api/eval/judges` | Creates/updates a registered judge |
| DELETE | `/api/eval/judges` | Deletes a registered judge |
| GET | `/api/eval/table-preview` | Returns columns + sample rows (default 3) for a UC table |
| POST | `/api/eval/run` | Runs batch eval: model × dataset → mlflow.genai.evaluate() |

---

## Key Patterns

### Prompt Names
Fully qualified: `catalog.schema.name`. All prompt endpoints use query params, not path params.

### Config Flow
`app.yaml` env vars → `GET /api/config` → `useConfig()` in React → App.tsx initializes catalog/schema/experiment state. `catalog` initializes to `''` (race condition guard — `usePrompts` waits for config to load before fetching).

### Async MLflow Pattern
All MLflow SDK calls are synchronous. Wrapped with `asyncio.to_thread()` in all async FastAPI route handlers, including warehouse calls. `/api/eval/table-preview` uses `asyncio.gather()` to fetch columns + rows in parallel.

### Variable Validation (`routes/run.py`)
`_validate_variables()` runs before prompt loading on every `/api/run` call:
- Rejects values exceeding 50,000 characters (returns 400)
- Rejects values containing `{{...}}` template syntax (injection guard; returns 400)

### Eval Column Pre-flight (`routes/evaluate.py`)
After reading dataset rows, before any model calls: checks all `column_mapping` values exist in row keys. Returns 400 with the missing column name(s) and list of available columns.

### `call_model()` Timeout (`llm.py`)
`aiohttp.ClientTimeout(total=120)` applied to all model serving calls.

### `render_template()` Lambda Fix (`templates.py`)
Uses `lambda m, v=value: v` as the `re.sub` replacement to prevent `re.error` when variable values contain backslash sequences (e.g. Windows paths `C:\Users\john`).

### Auth Pattern
```python
# mlflow_helpers.py / mlflow_client.py
if os.getenv("IS_DATABRICKS_APP"):
    client = WorkspaceClient()      # M2M OAuth, auto from env
else:
    client = WorkspaceClient(profile="DEFAULT")  # local ~/.databrickscfg
```

---

## Prompt Template Storage

Templates are stored as plain strings in the MLflow Prompt Registry. The `{{variable}}` syntax marks substitution points. Variables are extracted by `parse_template_variables()` in `templates.py`.

`get_prompt_template()` in `mlflow_client.py` returns:
```python
{
    "name": str,           # fully qualified: catalog.schema.name
    "version": str,
    "template": str,       # raw template string as stored in the registry
    "variables": list[str],  # extracted {{var}} names in order of appearance
    "tags": dict,
    "aliases": list[str],
}
```

### Planned: System/User Prompt Splitting (branch: `feature/system-user-prompt-splitting`)
A storage convention using XML tags is being added in a separate branch:
```
<system>
You are a helpful assistant for {{company}}.
</system>

<user>
Help me with: {{topic}}
</user>
```
When merged, `templates.py` will gain `parse_system_user()` and `buildXmlTemplate()`, and `call_model()` will accept a `system_prompt` parameter to build a proper `[{role:system},{role:user}]` message list.

---

## Eval Flow

1. Dataset rows read from UC table via SQL Warehouse
2. **Column pre-flight check**: all `column_mapping` values verified against row keys; 400 with named missing + available columns if any missing
3. Model called for each row **concurrently** via `asyncio.gather()` + `asyncio.Semaphore(10)`
4. All pre-computed outputs passed to `mlflow.genai.evaluate()` in a thread
4. Scores extracted from `eval_result.result_df` (primary) or MLflow traces (fallback)

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
- `RunResponse`: `{ rendered_prompt, response, model, usage, run_id, experiment_url }`

### Frontend (TypeScript — `types.ts`)
- `PromptTemplate`: `{ name, version, template, variables, tags, aliases }`
- `RunResponse`: `{ rendered_prompt, response, model, usage: { prompt_tokens?, completion_tokens?, total_tokens? }, run_id?, experiment_url? }`
- `JudgeDetail`: `{ name, type: 'custom'|'guidelines', instructions, guidelines }`

---

## Privileges Required

```sql
GRANT USE CATALOG ON CATALOG <catalog> TO `<sp-client-id>`;
GRANT USE SCHEMA, CREATE FUNCTION, EXECUTE, MANAGE ON SCHEMA <catalog>.<prompt_schema> TO `<sp-client-id>`;
GRANT USE SCHEMA, SELECT ON SCHEMA <catalog>.<eval_schema> TO `<sp-client-id>`;
```

**Note**: `MANAGE` must be granted explicitly — `ALL PRIVILEGES` does NOT include it.
