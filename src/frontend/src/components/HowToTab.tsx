import {
  BookOpen,
  ArrowRight,
  Play,
  FlaskConical,
  Database,
  BarChart2,
  Link2,
  GitBranch,
  Layers,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  Braces,
  SlidersHorizontal,
  Table2,
  Star,
  ArrowLeftRight,
  FileText,
  RotateCcw,
  Wand2,
  Eye,
} from 'lucide-react';

function Section({ icon: Icon, title, color, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`px-5 py-3.5 flex items-center gap-2.5 border-b border-gray-100 ${color}`}>
        <Icon className="w-4 h-4" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Step({ num, icon: Icon, title, children }: {
  num: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-databricks-red text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {num}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        <div className="text-xs text-gray-600 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function FlowNode({ icon: Icon, label, sub, accent, muted }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border text-center min-w-[120px] ${
      accent
        ? 'bg-databricks-red/5 border-databricks-red/30'
        : muted
        ? 'bg-gray-50 border-dashed border-gray-300'
        : 'bg-gray-50 border-gray-200'
    }`}>
      <Icon className={`w-5 h-5 ${accent ? 'text-databricks-red' : 'text-gray-500'}`} />
      <span className={`text-xs font-semibold ${accent ? 'text-databricks-red' : 'text-gray-700'}`}>{label}</span>
      <span className="text-[10px] text-gray-400 leading-tight">{sub}</span>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
      <span>{children}</span>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-xs text-gray-600">
      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-green-500" />
      <span>{children}</span>
    </li>
  );
}

export default function HowToTab() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Hero */}
        <div className="bg-databricks-dark rounded-xl px-6 py-5 text-white">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-databricks-red flex items-center justify-center flex-shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold mb-1">Prompt Playground — How It Works</h1>
              <p className="text-sm text-gray-300 leading-relaxed">
                The Databricks Prompt Registry stores and versions prompts, but testing and evaluating them
                requires writing Python code. This app gives anyone on your team a UI to
                do all of that — browse and edit prompts, test them against models, run batch
                evaluations against datasets, and track every result in Experiments — without writing any code.
              </p>
            </div>
          </div>
        </div>

        {/* Tab overview */}
        <Section icon={ArrowLeftRight} title="How the Three Tabs Work Together" color="bg-indigo-50 text-indigo-700">
          <p className="text-xs text-gray-500 mb-4">
            The three tabs — <strong>Prompts</strong>, <strong>Playground</strong>, and <strong>Evaluate</strong> — share
            the same prompt, version, and model selection. Your choices carry over automatically when you switch tabs,
            and all panel state (eval dataset, column mapping, judge config) is preserved.
            The natural workflow is: browse and pick a prompt, test it interactively, then run a batch evaluation.
          </p>
          <div className="flex flex-wrap items-center gap-2 justify-center mb-5">
            <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border text-center bg-gray-50 border-gray-200">
              <FileText className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">Prompts</span>
              <span className="text-[10px] text-gray-400 leading-tight">Browse registry<br/>Pick prompt + version</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border text-center bg-red-50 border-databricks-red/30">
              <Play className="w-5 h-5 text-databricks-red" />
              <span className="text-xs font-semibold text-databricks-red">Playground</span>
              <span className="text-[10px] text-gray-400 leading-tight">Fill variables<br/>Test with sample inputs</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border text-center bg-purple-50 border-purple-300">
              <FlaskConical className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-semibold text-purple-700">Evaluate</span>
              <span className="text-[10px] text-gray-400 leading-tight">Prompt + model pre-filled<br/>Run against a full dataset</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <FlowNode icon={BarChart2} label="Experiments" sub="In Databricks UI" muted />
          </div>
          <p className="text-[11px] text-gray-400 text-center mb-4">
            Both playground runs and evaluation runs are automatically logged to the <strong>Experiments</strong> section
            of Databricks — separate from this app, where you can compare versions and review traces over time.
          </p>
          <Tip>
            You don't need to re-select your prompt or model when switching tabs. If you've already configured
            a prompt version and model in Playground, those selections carry over automatically to Evaluate — just
            pick a dataset and map the columns.
          </Tip>
        </Section>

        {/* Architecture */}
        <Section icon={Layers} title="How This App Connects to Databricks" color="bg-gray-50 text-gray-700">
          <div className="flex flex-wrap items-center gap-2 justify-center mb-5">
            <FlowNode icon={GitBranch} label="Prompt Registry" sub="MLflow / UC" />
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <FlowNode icon={Play} label="Playground" sub="This app" accent />
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <FlowNode icon={Cpu} label="Model Serving" sub="AI Gateway" />
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <FlowNode icon={BarChart2} label="Experiments" sub="MLflow tracking" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                <GitBranch className="w-3.5 h-3.5" /> MLflow Prompt Registry
              </div>
              <p className="text-gray-500 leading-relaxed">
                Source of truth for prompts. Engineers register versions with{' '}
                <code className="bg-white border border-gray-200 px-1 rounded">{'{{variable}}'}</code>{' '}
                placeholders and aliases like <code className="bg-white border border-gray-200 px-1 rounded">production</code>.
                Stored in Unity Catalog — set the catalog and schema fields in the Prompts tab to point to yours.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                <Cpu className="w-3.5 h-3.5" /> AI Gateway / Model Serving
              </div>
              <p className="text-gray-500 leading-relaxed">
                Databricks Foundation Model API endpoints and any custom serving endpoints.
                The model selector lists every READY chat endpoint — Foundation Models appear first.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                <BarChart2 className="w-3.5 h-3.5" /> Experiments (Databricks UI)
              </div>
              <p className="text-gray-500 leading-relaxed">
                Every run — playground and evaluation — is automatically logged to a GenAI experiment
                and linked to the specific prompt version. Find it under{' '}
                <strong>AI/ML → Experiments</strong> in Databricks.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                <Database className="w-3.5 h-3.5" /> Unity Catalog (Eval Data)
              </div>
              <p className="text-gray-500 leading-relaxed">
                Eval datasets are Delta tables in Unity Catalog. The Evaluate tab reads rows via SQL
                Warehouse and maps columns to prompt variables.
              </p>
            </div>
          </div>
        </Section>

        {/* Prompts tab */}
        <Section icon={FileText} title="Prompts Tab — Browse, Manage, Edit" color="bg-gray-50 text-gray-700">
          <div className="space-y-4">
            <Step num={1} icon={GitBranch} title="Set the Prompt Registry Location">
              Enter the <strong>catalog</strong> and <strong>schema</strong> where your MLflow Prompt Registry
              prompts live. The app loads all prompts from that location. Use the{' '}
              <strong>Experiment</strong> selector in the header to scope the prompt list to only prompts
              that have been run in a specific MLflow experiment — a count badge shows how many match.
            </Step>
            <Step num={2} icon={Tag} title="Browse Prompts and Versions">
              Select a prompt from the searchable dropdown. The version list populates automatically —
              click any version to select it. Each version card shows a short preview of the template with{' '}
              <code className="bg-gray-100 px-1 rounded">{'{{variable}}'}</code> placeholders, description,
              and any aliases (like <code className="bg-gray-100 px-1 rounded">production</code>).
              <br /><br />
              The <strong>Prompt Preview</strong> panel on the right shows the full template with variables
              highlighted. If the template uses{' '}
              <code className="bg-gray-100 px-1 rounded">&lt;system&gt;</code>{' '}and{' '}
              <code className="bg-gray-100 px-1 rounded">&lt;user&gt;</code>{' '}XML tags, the preview strips them
              by default — click <strong>Raw</strong> in the header to see the full template with tags.
            </Step>
            <Step num={3} icon={Braces} title="Edit or Create Prompts">
              Click <strong>New Version</strong> in the Preview panel header to edit the template in a
              textarea. Saving registers a new version in the Prompt Registry — the original is never changed.
              Click the <strong>+</strong> icon next to the Prompt label to create a brand-new prompt from scratch.
            </Step>
            <Step num={4} icon={Play} title="Test in Playground">
              Once you've selected a prompt and version, click <strong>Test in Playground →</strong> at
              the bottom of the left panel. Your selection carries over automatically — you land in the
              Playground with the prompt and version already loaded.
            </Step>
            <Tip>
              <strong>No prompt yet?</strong> Click the <strong>+</strong> icon next to "Prompt" to register
              a new prompt — fill in a name, optional description, and template, and it's registered immediately.
              You can test it in Playground right away without reloading.
            </Tip>
          </div>
        </Section>

        {/* Playground tab */}
        <Section icon={Play} title="Playground Tab — Test Interactively" color="bg-red-50 text-databricks-red">
          <div className="space-y-4">
            <Step num={1} icon={Tag} title="Load a Prompt">
              The prompt and version you selected in the <strong>Prompts tab</strong> carry over automatically.
              If nothing is selected yet, click <strong>Select a prompt →</strong> to go to the Prompts tab.
              The loaded prompt name and version are shown at the top of the left panel — click{' '}
              <strong>Change →</strong> to go back and switch.
            </Step>
            <Step num={2} icon={Braces} title="Fill in Template Variables">
              Input fields appear for every{' '}
              <code className="bg-gray-100 px-1 rounded">{'{{variable}}'}</code> in the template.
              The <strong>Prompt Preview</strong> panel updates live as you type — showing exactly what will
              be sent to the model, with unfilled variables highlighted in amber.
              <br /><br />
              An orange warning badge appears at the bottom if any variables are empty when you click Run —
              you can still run with empty variables, the warning is informational.
            </Step>
            <Step num={3} icon={Cpu} title="Select a Model and Run">
              Choose any READY serving endpoint from the model dropdown. Adjust Max Tokens and Temperature
              in <strong>Run Settings</strong> if needed, then click <strong>Run Prompt</strong>. The response
              appears in the bottom panel with token usage and a <strong>View in Experiment ↗</strong> link.
            </Step>
            <Tip>
              <strong>Reset button</strong> (↺ next to Run): clears both the response panel <em>and</em> all
              variable inputs — useful when switching to a different test case.
            </Tip>
            <Tip>
              <strong>Then switch to Evaluate:</strong> your prompt, version, and model carry over automatically.
              Just pick an eval dataset and map the columns to run a full batch evaluation.
            </Tip>
          </div>
        </Section>

        {/* Evaluate tab */}
        <Section icon={FlaskConical} title="Evaluate Tab — Batch Evaluation" color="bg-purple-50 text-purple-700">
          <div className="space-y-4">
            <Step num={1} icon={Table2} title="Pick an Eval Dataset">
              Set the eval dataset catalog and schema at the top of the left panel, then pick a table
              from the searchable dropdown. The app reads the table schema automatically — columns
              load into the variable mapping section once a table is selected.
            </Step>
            <Step num={2} icon={Tag} title="Select Prompt and Version">
              If you came from Playground, your prompt and version are already set. Otherwise pick them
              from the searchable dropdowns. Expand <strong>Prompt Preview</strong> to review the full
              template with variable placeholders highlighted — click <strong>Raw</strong> to see the
              template with any XML tags if needed.
            </Step>
            <Step num={3} icon={Star} title="Configure the Judge">
              The <strong>Judge</strong> section controls how responses are scored after the model runs.
              Options:
              <ul className="mt-2 space-y-1 list-none">
                <li><strong>Default quality scorer</strong> — a built-in 1–5 LLM-as-judge. Set <strong>Judge Model</strong> (defaults to the same model as the prompt) and <strong>Judge Temperature</strong> (keep at 0 for consistent scores).</li>
                <li className="mt-1"><strong>Built-in presets</strong> — Safety, Relevance to Query, Fluency, Completeness, Summarization, Correctness — managed by Databricks, no config needed.</li>
                <li className="mt-1"><strong>Registered judges</strong> — reusable, saved per-experiment. Click <strong>+ New</strong> to create one:</li>
              </ul>
              <ul className="mt-1.5 ml-3 space-y-0.5 list-none">
                <li><em>Custom</em> — write free-form instructions describing what to score and how.</li>
                <li><em>Guidelines</em> — define a checklist of specific rules. Each rule is evaluated independently; results show a per-rule pass/fail breakdown in the results panel.</li>
              </ul>
              <br />
              To <strong>edit</strong> a registered judge, select it from the dropdown and click the pencil
              icon. To <strong>delete</strong> it, click the trash icon — a confirmation dialog will appear
              before anything is removed.
            </Step>
            <Step num={4} icon={Link2} title="Select Model, Map Variables, and Run">
              Pick the model to call for each row. Then map each{' '}
              <code className="bg-gray-100 px-1 rounded">{'{{variable}}'}</code> to a column from the
              dataset. Click <strong>Auto</strong> (✦ wand icon) to automatically fill in any variables
              whose names exactly match a column name. Use the <strong>×</strong> button to clear all
              mappings and start over.
              <br /><br />
              Set <strong>Max Rows</strong> (1–20) and click <strong>Run Evaluation</strong>. Results appear
              as expandable cards showing the score, rationale, and full response. For{' '}
              <strong>Guidelines judges</strong>, each card shows a per-rule pass/fail checklist.
              The average score shows in the summary header.
            </Step>
            <Tip>
              <strong>Reset button</strong> (↺ next to Run Evaluation): clears the results table <em>and</em>{' '}
              the column mapping — useful when switching to a different dataset or version.
            </Tip>
            <Tip>
              <strong>Back in Databricks:</strong> the eval run is logged to the experiment with an{' '}
              <code>eval_type: batch</code> tag and avg score metric.
              Per-row scores and rationales are in the Traces tab. The run is linked to the prompt version
              for cross-version comparison.
            </Tip>
          </div>
        </Section>

        {/* What you see in Databricks */}
        <Section icon={BarChart2} title="What to Look For in Databricks" color="bg-green-50 text-green-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> Experiments
              </p>
              <ul className="space-y-1.5">
                <Check>Under <strong>Observability → Traces</strong>: every run logged here, tagged with prompt name and version</Check>
                <Check>Under <strong>Evaluation → Evaluation runs</strong>: batch eval runs with avg_score metric and per-row scores</Check>
                <Check>Under <strong>Prompts & versions → Prompts</strong>: the prompt registry — browse versions, see linked runs</Check>
                <Check>Click any trace to see the full request, response, score, and rationale</Check>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" /> Prompt Registry
              </p>
              <ul className="space-y-1.5">
                <Check>Navigate to <strong>AI/ML → Experiments → [your experiment] → Prompts & versions → Prompts</strong></Check>
                <Check>Click a version — the <strong>Linked Runs</strong> tab shows every playground and eval run that used it</Check>
                <Check>Full audit trail: which prompt version, which model, what scores</Check>
                <Check>Compare v1 vs v2 runs side by side to decide which version to promote to <strong>production</strong></Check>
              </ul>
            </div>
          </div>
        </Section>

        {/* Quick reference */}
        <Section icon={ExternalLink} title="Quick Reference — Where Things Live in Databricks" color="bg-gray-50 text-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-semibold">What</th>
                  <th className="text-left pb-2 font-semibold">Where in Databricks</th>
                  <th className="text-left pb-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['Registered prompts', 'AI/ML → Experiments → [experiment] → Prompts & versions → Prompts', 'Browse versions, aliases, template previews'],
                  ['Playground & eval traces', 'AI/ML → Experiments → [experiment] → Observability → Traces', 'All runs logged here; playground runs show individual spans'],
                  ['Evaluation runs with scores', 'AI/ML → Experiments → [experiment] → Evaluation → Evaluation runs', 'Per-row scores and rationales from the LLM judge'],
                  ['Prompt–run linkage', 'AI/ML → Experiments → [experiment] → Prompts & versions → Prompts → [version]', 'Linked Runs tab shows all runs that used a given version'],
                  ['Eval datasets', 'Catalog → your catalog → your eval schema', 'Delta tables; any table with matching column names works'],
                  ['Model endpoints', 'AI/ML → Serving', 'Filter for READY; Foundation Models listed first'],
                ].map(([what, where, notes]) => (
                  <tr key={what} className="text-gray-600">
                    <td className="py-1.5 pr-4 font-medium text-gray-800 whitespace-nowrap">{what}</td>
                    <td className="py-1.5 pr-4"><code className="bg-gray-100 px-1 rounded text-[11px]">{where}</code></td>
                    <td className="py-1.5 text-gray-500">{notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

      </div>
    </div>
  );
}
