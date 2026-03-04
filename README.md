# Prompt Playground

Prompt Playground is an interactive, no-code Databricks App for designing, testing, and evaluating prompts stored in the [Prompt Registry](https://docs.databricks.com/aws/en/mlflow3/genai/prompt-version-mgmt/prompt-registry/). It enables product owners, prompt engineers, and both technical and non-technical users to iterate on prompt templates, run them against live model serving endpoints, and evaluate quality at scale — without writing code.

- **Manage prompts** — browse, create, and version prompt templates directly from the UI
- **Iterate interactively** — fill in `{{template_variables}}`, run against any model serving endpoint, and preview the fully rendered prompt before executing
- **Evaluate at scale** — run a prompt version against any Unity Catalog Delta table, score with built-in LLM-as-judge presets or custom judges, and triage low-scoring results in-app
- **Tightly integrated with Databricks** — every run and evaluation is logged as an MLflow trace with direct links to the Experiments UI; all data stays in your Unity Catalog environment

## Installation

### Prerequisites

- [Databricks CLI](https://docs.databricks.com/dev-tools/cli/install.html) `>= 0.220.0`
- A **Unity Catalog catalog** with your MLflow Prompt Registry prompts (and optionally evaluation datasets)
- A **SQL Warehouse** running in your workspace (needed for eval dataset queries)
- A **model serving endpoint** — [Foundation Model API](https://docs.databricks.com/machine-learning/foundation-models/index.html) endpoints work out of the box

### Setup

**1. Clone the repository**

```bash
git clone https://github.com/databricks-solutions/prompt-playground.git
cd prompt-playground
```

**2. Configure your SQL Warehouse**

Open `databricks.yml` and set your warehouse by name (recommended):

```yaml
variables:
  warehouse_id:
    description: "SQL Warehouse for eval queries"
    lookup:
      warehouse: "Serverless Starter Warehouse"   # replace with your warehouse name
```

Or set the warehouse ID directly:

```yaml
variables:
  warehouse_id:
    default: "abc1234def567890"   # find this in SQL > Warehouses > <name> > Connection details
```

**3. Deploy**

```bash
databricks bundle validate
databricks bundle deploy
databricks bundle run prompt_playground
```

The app URL will be printed in the output. You can also find it under **Compute > Apps** in your workspace.

## Usage

**Register your first prompt from within the app (no code):**

1. Open the Prompt Playground app
2. Click the **+** icon next to the Prompt selector
3. Fill in a name, optional description, and template (use `{{variable}}` placeholders)
4. Click **Create Prompt** — the new prompt is registered and immediately selected

**Or register from a notebook:**

```python
import mlflow

mlflow.set_registry_uri("databricks-uc")

mlflow.register_prompt(
    name="your_catalog.prompts.my_prompt",
    template="You are a helpful assistant. Answer: {{question}}",
    commit_message="Initial version",
)
```

Then open the app and select your prompt from the dropdown.

> **Editing templates in-app:** Select a prompt and version, then click **+ New version** to open the editor. Saving registers a new version automatically.

## Troubleshooting

**App fails to start / "MANAGE privilege" error**
→ The service principal is missing `MANAGE` on the prompts schema.

**"No prompts found"**
→ Check that `PROMPT_CATALOG` and `PROMPT_SCHEMA` in `src/app.yaml` match where your prompts are registered, and that the service principal has access.

**Eval datasets not loading**
→ Verify `EVAL_SCHEMA` in `src/app.yaml` and that the service principal has `SELECT` on that schema.

**Model endpoint not listed**
→ The endpoint may not be in `READY` state. Check **Serving > Endpoints** in your workspace.

## How to get help

For questions or bugs, please contact agents-outreach@databricks.com and the team will reach out shortly.

## License

This project is licensed under the [Databricks DB License](LICENSE.md).

| library | description | license | source |
|---------|-------------|---------|--------|
| React | Frontend framework | MIT | https://github.com/facebook/react |
| FastAPI | Backend web framework | MIT | https://github.com/tiangolo/fastapi |
| Tailwind CSS | Utility-first CSS | MIT | https://github.com/tailwindlabs/tailwindcss |
| Vite | Frontend build tool | MIT | https://github.com/vitejs/vite |
| MLflow | ML lifecycle management | Apache 2.0 | https://github.com/mlflow/mlflow |
| Lucide React | Icon library | ISC | https://github.com/lucide-icons/lucide |
