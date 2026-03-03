# Prompt Playground

Prompt Playground is an interactive, no-code Databricks App for designing, testing, and evaluating prompts stored in the [MLflow Prompt Registry](https://docs.databricks.com/aws/en/mlflow3/genai/prompt-version-mgmt/prompt-registry/). It enables product owners, prompt engineers, and both technical and non-technical users to iterate on prompt templates, run them against live model serving endpoints, and evaluate quality at scale — no Python required.

## What you can do

- **Manage prompts** — browse, create, and version prompt templates directly from the UI; no code required
- **Iterate interactively** — fill in `{{template_variables}}`, run against any model serving endpoint, and preview the fully rendered prompt before executing
- **Evaluate at scale** — run a prompt version against any Unity Catalog Delta table, auto-map dataset columns to template variables, score with built-in LLM-as-judge presets or your own custom judges, and triage low-scoring results in-app
- **Tightly integrated with Databricks** — every run and evaluation is logged as an MLflow trace with direct links to the Experiments UI, including prompt versions, model calls, scores, and judge reasoning; all data stays in your Unity Catalog environment

---

## Prerequisites

Before deploying, make sure you have:

- [ ] [Databricks CLI](https://docs.databricks.com/dev-tools/cli/install.html) `>= 0.220.0` installed
- [ ] A **Unity Catalog catalog** with your MLflow Prompt Registry prompts (and optionally evaluation datasets)
- [ ] A **SQL Warehouse** running in your workspace (needed for eval dataset queries)
- [ ] A **model serving endpoint** — [Foundation Model API](https://docs.databricks.com/machine-learning/foundation-models/index.html) endpoints work out of the box
- [ ] **Workspace admin or** CAN_MANAGE permission on the catalog

---

## Step-by-Step Deployment

### 1. Authenticate with your workspace

```bash
databricks auth login --host https://<your-workspace>.azuredatabricks.net
```

Verify authentication:

```bash
databricks auth profiles
```

### 2. Extract and open the project

Unzip the file you received, then navigate into the folder:

```bash
unzip prompt-playground.zip
cd prompt-playground
```

### 3. Configure your SQL Warehouse

Open `databricks.yml` and set your warehouse. You have two options:

**Option A — resolve by name (recommended):**

Comment out the `warehouse_id` variable block and replace it with:

```yaml
variables:
  warehouse_id:
    description: "SQL Warehouse for eval queries"
    lookup:
      warehouse: "Serverless Starter Warehouse"   # replace with your warehouse name
```

**Option B — set the ID directly:**

```yaml
variables:
  warehouse_id:
    default: "abc1234def567890"   # find this in SQL > Warehouses > <name> > Connection details
```

### 4. Configure your catalog and schema

Open `src/app.yaml` and update the three env vars:

```yaml
env:
  - name: PROMPT_CATALOG
    value: "your_catalog"       # UC catalog where your prompts live
  - name: PROMPT_SCHEMA
    value: "prompts"            # Schema containing the MLflow Prompt Registry
  - name: EVAL_SCHEMA
    value: "eval_data"          # Schema containing evaluation dataset tables
```

### 5. (Optional) Configure serving endpoint access

The app's **model dropdown** is populated dynamically — it lists every chat-compatible serving endpoint the app's service principal can see in the workspace. Users can select any endpoint from that list.

The `serving_endpoint` variable in `databricks.yml` grants the app's service principal `CAN_QUERY` on one specific endpoint:

```yaml
variables:
  serving_endpoint:
    default: "databricks-claude-sonnet-4-5"
```

**For custom endpoints**, only the endpoint named here is guaranteed to be callable. If users select a different custom endpoint from the dropdown and the SP doesn't have `CAN_QUERY` on it, calls will fail. To grant access to additional custom endpoints, add more resource entries:

```yaml
resources:
  apps:
    prompt_playground:
      resources:
        - name: serving-endpoint
          serving_endpoint:
            name: databricks-claude-sonnet-4-5
            permission: CAN_QUERY
        - name: my-custom-endpoint
          serving_endpoint:
            name: my-custom-endpoint
            permission: CAN_QUERY
```

### 6. Validate the configuration

```bash
databricks bundle validate
```

Fix any errors before continuing.

### 7. Deploy

```bash
# Deploy to dev (default)
databricks bundle deploy

# Deploy to prod
databricks bundle deploy -t prod
```

### 8. Start the app

```bash
# Start in dev
databricks bundle run prompt_playground

# Start in prod
databricks bundle run prompt_playground -t prod
```

The app URL will be printed in the output. You can also find it in your workspace under **Compute > Apps**.

### 9. Verify the deployment

```bash
databricks bundle summary
```

---

## Grant Service Principal Access

After the first deploy, find your app's service principal client ID:

1. Go to **Compute > Apps** in your workspace
2. Click on **prompt-playground**
3. Find the **Service principal** client ID in the app details

Then run the following SQL in a notebook or SQL editor:

```sql
-- Required for catalog access
GRANT USE CATALOG ON CATALOG <your_catalog> TO `<sp-client-id>`;

-- Required for MLflow Prompt Registry (MANAGE is NOT included in ALL PRIVILEGES)
GRANT USE SCHEMA, CREATE FUNCTION, EXECUTE, MANAGE
  ON SCHEMA <your_catalog>.<prompt_schema>
  TO `<sp-client-id>`;

-- Required for eval dataset queries
GRANT USE SCHEMA, SELECT
  ON SCHEMA <your_catalog>.<eval_schema>
  TO `<sp-client-id>`;
```

> **Important:** The `MANAGE` privilege on the prompt schema is required for the MLflow Prompt Registry to function. It is **not** granted by `ALL PRIVILEGES` and must be granted explicitly.

---

## Share the App with Users

By default only workspace admins can access the app. To grant access to others:

```bash
databricks permissions update apps prompt-playground \
  --json '[
    {"user_name": "user@example.com", "permission_level": "CAN_USE"},
    {"group_name": "data-team", "permission_level": "CAN_USE"}
  ]'
```

Or grant access in the Databricks UI under **Compute > Apps > prompt-playground > Permissions**.

---

## Register Your First Prompt

**Option A — from within the app (no code):**

1. Open the Prompt Playground app
2. In the **Playground** tab, click the **+** icon next to the Prompt selector
3. Fill in a name, optional description, and template (use `{{variable}}` placeholders)
4. Click **Create Prompt** — the new prompt is registered and immediately selected

**Option B — from a notebook or the MLflow UI:**

```python
import mlflow

mlflow.set_registry_uri("databricks-uc")

mlflow.register_prompt(
    name="your_catalog.prompts.my_prompt",
    template="You are a helpful assistant. Answer: {{question}}",
    commit_message="Initial version",
)
```

Then open the Prompt Playground app and select your prompt from the dropdown.

> **Editing templates in-app:** Select a prompt and version, then click the **+ New version** button (top-right of the Prompt Preview panel) to open the editor. Saving registers a new version automatically.

---

## Redeploy After Changes

If you change `src/app.yaml` (catalog/schema) or `databricks.yml` (warehouse, endpoint):

```bash
databricks bundle deploy
databricks bundle run prompt_playground
```

If you modify the Python source code:

```bash
databricks bundle deploy
databricks bundle run prompt_playground
```

If you modify the React frontend source (`src/frontend/src/`):

```bash
cd src/frontend
npm install
npm run build
cd ../..
databricks bundle deploy
databricks bundle run prompt_playground
```

---

## Destroy

To remove the deployed app and all associated resources:

```bash
databricks bundle destroy
```

---

## Local Development

### Run the server locally

The app runs as a FastAPI server served from `src/`. The React frontend is pre-built — no Node.js needed to run locally.

**1. Authenticate with Databricks:**

```bash
databricks auth login --host https://<your-workspace>.azuredatabricks.net
```

**2. Install dependencies:**

```bash
# With pip
pip install -r src/requirements.txt

# Or with uv
uv pip install -r src/requirements.txt
```

**3. Set required environment variables:**

```bash
export PROMPT_CATALOG="your_catalog"
export PROMPT_SCHEMA="prompts"
export EVAL_SCHEMA="eval_data"
export SQL_WAREHOUSE_ID="abc1234def567890"   # needed for eval; find in SQL > Warehouses > Connection details
# Optional: scope model dropdown to a specific experiment
export MLFLOW_EXPERIMENT_NAME="/Shared/prompt-playground-evaluation"
```

**4. Start the server from the `src/` directory:**

```bash
cd src
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

> **Note:** `--reload` enables auto-restart on Python file changes. The frontend is served from the pre-built `src/frontend/dist/` — rebuild it (`cd src/frontend && npm run build`) to pick up frontend changes.

---

### Run tests

Run tests locally (requires Python 3.11+):

**With pip:**
```bash
pip install fastapi uvicorn "mlflow[databricks]" databricks-sdk pydantic aiohttp httpx pytest requests
pytest tests/ -v --ignore=tests/test_template_rendering.py
```

**With uv:**
```bash
uv run --no-project --python 3.11 \
  --with "fastapi>=0.115.0,httpx>=0.27.0,pytest,mlflow[databricks]>=3.1.0,databricks-sdk>=0.30.0,pydantic>=2.0.0,aiohttp>=3.9.0,uvicorn,requests" \
  pytest tests/ -v --ignore=tests/test_template_rendering.py
```

> **Note:** `tests/test_template_rendering.py` requires a live Databricks connection and is excluded from local runs.

---

## Troubleshooting

**App fails to start / "MANAGE privilege" error**
→ The service principal is missing `MANAGE` on the prompts schema. Run the SQL grants in the section above.

**"No prompts found"**
→ Check that `PROMPT_CATALOG` and `PROMPT_SCHEMA` in `src/app.yaml` match where your prompts are registered, and that the service principal has access.

**Eval datasets not loading**
→ Verify `EVAL_SCHEMA` in `src/app.yaml` and that the service principal has `SELECT` on that schema.

**Model endpoint not listed**
→ The endpoint may not be in `READY` state. Check **Serving > Endpoints** in your workspace.

**401 / auth errors during local dev**
→ Re-authenticate: `databricks auth login --host <workspace-url>`

---

## Support

Databricks does not offer official support for Databricks Solutions and its repository.
For any issue with this app, please open an issue on GitHub and the team will have a look on a best effort basis.
