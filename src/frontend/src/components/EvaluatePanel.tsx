import { useState, useEffect } from 'react';
import { FlaskConical, Loader2, ChevronDown, ChevronUp, FileText, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import type { PromptInfo, PromptVersion, PromptTemplate } from '../types';
import { useEvalTables, useEvalColumns, useRunEval, useJudges, useDeleteJudge, useJudgeDetail } from '../hooks/useEvalApi';
import { parseTemplateVariables } from '../utils/templateUtils';
import JudgeForm from './eval/JudgeForm';
import EvalResults from './eval/EvalResults';
import ConfirmDialog from './ConfirmDialog';

const BUILTIN_JUDGES = [
  { value: 'safety', label: 'Safety' },
  { value: 'relevance_to_query', label: 'Relevance to Query' },
  { value: 'fluency', label: 'Fluency' },
  { value: 'completeness', label: 'Completeness' },
  { value: 'summarization', label: 'Summarization' },
];

interface Props {
  evalCatalog: string;
  evalSchema: string;
  prompts: PromptInfo[];
  allPromptsCount: number;
  versions: PromptVersion[];
  selectedPrompt: string | null;
  selectedVersion: string | null;
  onSelectPrompt: (name: string | null) => void;
  onSelectVersion: (version: string | null) => void;
  models: { name: string; state: string }[];
  selectedModel: string | null;
  onSelectModel: (name: string) => void;
  template: PromptTemplate | null;
  experimentName: string;
  experiments: { name: string }[];
  experimentsLoading: boolean;
  onExperimentChange: (name: string) => void;
  filterByExperiment: boolean;
  onToggleFilter: (val: boolean) => void;
}

function TemplatePreview({ template }: { template: PromptTemplate }) {
  const [expanded, setExpanded] = useState(false);

  const highlighted = template.template.replace(
    /\{\{(\s*\w+\s*)\}\}/g,
    '<mark class="bg-purple-100 text-purple-700 rounded px-0.5 not-italic">{{$1}}</mark>'
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-600 flex-1">Prompt Template</span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        }
      </button>
      {expanded && (
        <div
          className="px-3 py-2.5 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-white"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      )}
    </div>
  );
}

function JudgePreview({ name }: { name: string }) {
  const [expanded, setExpanded] = useState(false);
  const { detail, loading } = useJudgeDetail(expanded ? name : null);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <Eye className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-600 flex-1">Judge Preview</span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
        {!loading && (expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2.5 bg-white">
          {loading ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : !detail ? (
            <p className="text-xs text-gray-400 italic">Could not load judge details.</p>
          ) : detail.type === 'guidelines' && detail.guidelines ? (
            <ol className="space-y-2">
              {detail.guidelines.map((g, i) => (
                <li key={i} className="flex gap-2 items-start text-xs text-gray-700">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{g}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{detail.instructions}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function EvaluatePanel({
  evalCatalog, evalSchema,
  prompts, allPromptsCount, versions, selectedPrompt, selectedVersion,
  onSelectPrompt, onSelectVersion, models, selectedModel, onSelectModel,
  template, experimentName, experiments, experimentsLoading, onExperimentChange,
  filterByExperiment, onToggleFilter,
}: Props) {
  const [localEvalCatalog, setLocalEvalCatalog] = useState(evalCatalog);
  const [localEvalSchema, setLocalEvalSchema] = useState(evalSchema);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [maxRows, setMaxRows] = useState(5);
  const [scorerName, setScorerName] = useState<string | null>(null);
  const [judgeModel, setJudgeModel] = useState<string>('');
  const [judgeTemperature, setJudgeTemperature] = useState(0);
  const [showCreateJudge, setShowCreateJudge] = useState(false);
  const [editingJudge, setEditingJudge] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { deleteJudge, loading: deleteLoading } = useDeleteJudge();

  const { judges, loading: judgesLoading, refresh: refreshJudges } = useJudges(experimentName);
  const { tables, loading: tablesLoading, error: tablesError } = useEvalTables(localEvalCatalog, localEvalSchema);
  const { columns } = useEvalColumns(localEvalCatalog, localEvalSchema, selectedTable);
  const { result, loading, error, runEval, reset } = useRunEval();

  // Auto-select latest version when versions load and none is selected
  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      onSelectVersion(versions[0].version);
    }
  }, [versions, selectedVersion, onSelectVersion]);

  // Use variables from the full template (reliable) or fall back to version preview parsing
  const variables: string[] = template?.variables ?? (() => {
    const selectedVersionData = versions.find((v) => v.version === selectedVersion);
    if (!selectedVersionData?.template_preview) return [];
    return parseTemplateVariables(selectedVersionData.template_preview);
  })();

  // Auto-populate mapping when columns load: if variable name exactly matches a column, pre-select it
  useEffect(() => {
    if (columns.length === 0 || variables.length === 0) return;
    setColumnMapping((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const v of variables) {
        if (!next[v] && columns.includes(v)) {
          next[v] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [columns, variables]);

  const canRun = !!(selectedPrompt && selectedVersion && selectedModel && selectedTable &&
    variables.every((v) => columnMapping[v]));

  const handleRun = async () => {
    if (!canRun || !selectedPrompt || !selectedVersion || !selectedModel || !selectedTable) return;
    reset();
    await runEval({
      prompt_name: selectedPrompt,
      prompt_version: selectedVersion,
      model_name: selectedModel,
      dataset_catalog: localEvalCatalog,
      dataset_schema: localEvalSchema,
      dataset_table: selectedTable,
      column_mapping: columnMapping,
      max_rows: maxRows,
      experiment_name: experimentName || undefined,
      scorer_name: scorerName || undefined,
      judge_model: judgeModel || undefined,
      judge_temperature: judgeTemperature,
    });
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left config panel */}
      <div className="w-80 xl:w-96 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-5">

        {/* Eval dataset — catalog, schema, and table in one group */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Eval Dataset</label>
          <div className="flex items-center gap-1 mb-2">
            <input
              type="text"
              className="text-sm border border-gray-200 rounded-md px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-databricks-red focus:border-transparent"
              placeholder="catalog"
              value={localEvalCatalog}
              onChange={(e) => { setLocalEvalCatalog(e.target.value); setSelectedTable(null); setColumnMapping({}); }}
            />
            <span className="text-gray-400 text-sm select-none">.</span>
            <input
              type="text"
              className="text-sm border border-gray-200 rounded-md px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-databricks-red focus:border-transparent"
              placeholder="schema"
              value={localEvalSchema}
              onChange={(e) => { setLocalEvalSchema(e.target.value); setSelectedTable(null); setColumnMapping({}); }}
            />
          </div>
          {tablesLoading ? (
            <p className="text-xs text-gray-400">Loading tables...</p>
          ) : tablesError ? (
            <p className="text-xs text-red-500" title={tablesError}>Failed to load tables — check catalog/schema and warehouse config.</p>
          ) : (
            <SearchableSelect
              value={selectedTable || ''}
              onChange={(val) => { setSelectedTable(val || null); setColumnMapping({}); }}
              placeholder="Select dataset table..."
              options={tables.map((t) => ({ value: t, label: t }))}
            />
          )}
        </div>

        {/* Experiment picker */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Experiment</label>
          <SearchableSelect
            value={experimentName}
            onChange={onExperimentChange}
            disabled={experimentsLoading}
            placeholder={experimentsLoading ? 'Loading...' : 'None (all prompts)'}
            options={experiments.map((e) => ({ value: e.name, label: e.name }))}
          />
          {experimentName && (
            <label className="mt-1.5 flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterByExperiment}
                onChange={(e) => onToggleFilter(e.target.checked)}
                className="w-3 h-3 rounded accent-databricks-red"
              />
              <span className="text-[11px] text-gray-500">
                Filter prompts to this experiment
                {filterByExperiment && (
                  <span className="text-gray-400"> ({prompts.length} of {allPromptsCount})</span>
                )}
              </span>
            </label>
          )}
        </div>

        {/* Prompt picker */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Prompt</label>
          <SearchableSelect
            value={selectedPrompt || ''}
            onChange={(val) => { onSelectPrompt(val || null); onSelectVersion(null); setColumnMapping({}); }}
            placeholder="Select prompt..."
            options={prompts.map((p) => ({ value: p.name, label: p.name.split('.').pop() ?? p.name }))}
          />
        </div>

        {/* Version picker */}
        {selectedPrompt && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Version</label>
            <SearchableSelect
              value={selectedVersion || ''}
              onChange={(val) => { onSelectVersion(val || null); setColumnMapping({}); }}
              placeholder="Select version..."
              options={versions.map((v) => ({
                value: v.version,
                label: `v${v.version}${v.aliases.length > 0 ? ` (${v.aliases.join(', ')})` : ''}`,
              }))}
            />
          </div>
        )}

        {/* Prompt template preview */}
        {template && selectedVersion && (
          <TemplatePreview template={template} />
        )}

        {/* Judge (registered scorer) picker */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Judge</label>
            <div className="flex items-center gap-1.5">
              {scorerName && !BUILTIN_JUDGES.some((b) => b.value === scorerName) && (
                <button
                  onClick={() => {
                    setEditingJudge(scorerName);
                    setShowCreateJudge(true);
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                  title="Edit judge"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {scorerName && !BUILTIN_JUDGES.some((b) => b.value === scorerName) && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteLoading}
                  className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                  title="Delete judge"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => {
                  setEditingJudge(null);
                  setShowCreateJudge(true);
                }}
                className="flex items-center gap-0.5 text-[11px] text-databricks-red hover:text-red-700 font-medium"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
          </div>
          <SearchableSelect
            value={scorerName || ''}
            onChange={(val) => setScorerName(val || null)}
            disabled={judgesLoading}
            placeholder="Default quality scorer"
            groups={[
              { label: 'Built-in Presets', options: BUILTIN_JUDGES },
              ...(judges.length > 0
                ? [{ label: 'Registered Judges', options: judges.map((j) => ({ value: j.name, label: j.name })) }]
                : []),
            ]}
          />

          {scorerName && !BUILTIN_JUDGES.some((b) => b.value === scorerName) && (
            <JudgePreview key={scorerName} name={scorerName} />
          )}

          {/* Judge model + temperature — only relevant for the default quality scorer */}
          {!scorerName && (
            <div className="mt-3 space-y-3 pl-3 border-l-2 border-gray-100">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Judge Model
                </label>
                <SearchableSelect
                  value={judgeModel}
                  onChange={(val) => setJudgeModel(val)}
                  placeholder="Same as prompt model"
                  options={models.filter((m) => m.state === 'READY').map((m) => ({ value: m.name, label: m.name }))}
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Which model evaluates the responses. Defaults to the prompt model above.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Judge Temperature <span className="font-normal text-gray-400">({judgeTemperature.toFixed(1)})</span>
                </label>
                <input
                  type="range" min={0} max={1} step={0.1} value={judgeTemperature}
                  onChange={(e) => setJudgeTemperature(Number(e.target.value))}
                  className="w-full accent-databricks-red"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Lower = more consistent scores. Keep at 0 unless you want varied judgments.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Model picker */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Model</label>
          <SearchableSelect
            value={selectedModel || ''}
            onChange={(val) => onSelectModel(val)}
            placeholder="Select model..."
            options={models.filter((m) => m.state === 'READY').map((m) => ({ value: m.name, label: m.name }))}
          />
        </div>


        {/* Column mapping */}
        {selectedTable && variables.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Map Variables → Columns
            </label>
            <div className="space-y-2">
              {[...variables].sort((a, b) => {
                const posA = columns.indexOf(a);
                const posB = columns.indexOf(b);
                return (posA === -1 ? 999 : posA) - (posB === -1 ? 999 : posB);
              }).map((v) => (
                <div key={v} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded w-32 truncate">{`{{${v}}}`}</span>
                  <SearchableSelect
                    value={columnMapping[v] || ''}
                    onChange={(val) => setColumnMapping((prev) => ({ ...prev, [v]: val }))}
                    placeholder="column..."
                    options={columns.map((c) => ({ value: c, label: c }))}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Max rows */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Max Rows <span className="font-normal text-gray-400">({maxRows})</span>
          </label>
          <input
            type="range" min={1} max={20} value={maxRows}
            onChange={(e) => setMaxRows(Number(e.target.value))}
            className="w-full accent-databricks-red"
          />
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={!canRun || loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-databricks-red text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running evaluation...</>
          ) : (
            <><FlaskConical className="w-4 h-4" /> Run Evaluation</>
          )}
        </button>

        {!canRun && !loading && (
          <p className="text-xs text-gray-400 text-center">
            {!selectedPrompt ? 'Select a prompt' :
             !selectedVersion ? 'Select a version' :
             !selectedModel ? 'Select a model' :
             !selectedTable ? 'Select a dataset' :
             'Map all variables to columns'}
          </p>
        )}
      </div>

      {/* Right results panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
        )}

        {loading && !result && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-databricks-red mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Running {maxRows} rows through the model and scoring...</p>
              <p className="text-xs text-gray-400 mt-1">MLflow evaluate is running the LLM judge — this may take a minute</p>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Configure the evaluation and click Run</p>
              <p className="text-xs text-gray-400 mt-1">Each row in the dataset will be run through the prompt and scored with <code className="bg-gray-100 px-1 rounded">mlflow.evaluate()</code></p>
            </div>
          </div>
        )}

        {result && <EvalResults result={result} scorerName={scorerName} />}
      </div>

      {/* Delete judge confirmation */}
      {showDeleteConfirm && scorerName && (
        <ConfirmDialog
          title={`Delete "${scorerName}"?`}
          message="This judge will be permanently removed and can't be recovered."
          confirmLabel="Delete Judge"
          loading={deleteLoading}
          onConfirm={async () => {
            try {
              await deleteJudge({ name: scorerName, experiment_name: experimentName || undefined });
              setScorerName(null);
              refreshJudges();
            } catch { /* error in hook */ }
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Judge create/edit slide-over — rendered outside both panels so it overlays the full tab */}
      {showCreateJudge && (
        <JudgeForm
          experimentName={experimentName}
          editingJudge={editingJudge}
          onSaved={(name) => {
            setScorerName(name);
            refreshJudges();
            if (!editingJudge) {
              // New judge: close the form
              setShowCreateJudge(false);
              setEditingJudge(null);
            }
            // Edit: form stays open showing the success banner
          }}
          onCancel={() => {
            setShowCreateJudge(false);
            setEditingJudge(null);
          }}
        />
      )}
    </div>
  );
}
