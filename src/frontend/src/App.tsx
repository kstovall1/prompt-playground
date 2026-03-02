import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TabBar from './components/TabBar';
import type { Tab } from './components/TabBar';
import PromptSelector from './components/PromptSelector';
import VariableInputs from './components/VariableInputs';
import ModelSelector from './components/ModelSelector';
import RunControls from './components/RunControls';
import PromptPreview from './components/PromptPreview';
import ResponsePanel from './components/ResponsePanel';
import EvaluatePanel from './components/EvaluatePanel';
import HowToTab from './components/HowToTab';
import PromptForm from './components/PromptForm';
import { Loader2 } from 'lucide-react';
import {
  useConfig,
  usePrompts,
  usePromptVersions,
  usePromptTemplate,
  useModels,
  useExperiments,
  useExperimentPrompts,
  useRunPrompt,
  useSaveVersion,
  useCreatePrompt,
} from './hooks/useApi';
import { usePromptEditor } from './hooks/usePromptEditor';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('prompts');
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);

  // Load catalog/schema config from backend (set via app.yaml env vars)
  const { config, loading: configLoading } = useConfig();

  // Catalog / schema state — initialized from config once loaded
  const [catalog, setCatalog] = useState('');
  const [schema, setSchema] = useState('');

  // Experiment name state
  const [experimentName, setExperimentName] = useState('');
  const [filterByExperiment, setFilterByExperiment] = useState(true);

  // Sync catalog/schema/experiment from config once it loads
  useEffect(() => {
    if (config && !catalog) {
      setCatalog(config.prompt_catalog);
      setSchema(config.prompt_schema);
    }
    if (config && !experimentName) {
      setExperimentName(config.mlflow_experiment_name);
    }
  }, [config]);

  // Use '' as fallback (not 'main') so usePrompts won't fire until config is loaded
  const activeCatalog = catalog || config?.prompt_catalog || '';
  const activeSchema = schema || config?.prompt_schema || '';

  // Prompt state
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Model state
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(1.0);

  // API hooks
  const {
    prompts,
    loading: promptsLoading,
    error: promptsError,
    refresh: refreshPrompts,
  } = usePrompts(activeCatalog, activeSchema);
  const { versions, loading: versionsLoading, refresh: refreshVersions } = usePromptVersions(selectedPrompt);
  const { template, loading: templateLoading } = usePromptTemplate(
    selectedPrompt,
    selectedVersion
  );
  const {
    models,
    loading: modelsLoading,
    error: modelsError,
    refresh: refreshModels,
  } = useModels();
  const { experiments, loading: experimentsLoading } = useExperiments();
  const { promptNames: experimentPromptNames } = useExperimentPrompts(experimentName);
  const filteredPrompts = (filterByExperiment && experimentPromptNames)
    ? prompts.filter((p) => experimentPromptNames.includes(p.name))
    : prompts;
  const { result, loading: runLoading, error: runError, run, reset } = useRunPrompt();
  const { save: saveVersion, loading: saveLoading, error: saveError } = useSaveVersion();
  const { create: createPrompt, loading: createLoading, error: createError } = useCreatePrompt();

  const editor = usePromptEditor({
    template,
    selectedPrompt,
    activeCatalog,
    activeSchema,
    createPrompt,
    saveVersion,
    refreshPrompts,
    refreshVersions,
    setSelectedPrompt,
    setSelectedVersion,
    setVariableValues,
  });

  // Handle catalog/schema change - clear prompt selection
  const handleCatalogChange = useCallback((val: string) => {
    setCatalog(val);
    setSelectedPrompt(null);
    setSelectedVersion(null);
    setVariableValues({});
  }, []);

  const handleSchemaChange = useCallback((val: string) => {
    setSchema(val);
    setSelectedPrompt(null);
    setSelectedVersion(null);
    setVariableValues({});
  }, []);

  const handleExperimentChange = useCallback((name: string) => {
    setExperimentName(name);
    setFilterByExperiment(true);
  }, []);

  // Handle prompt selection - clear variables and exit edit mode
  const handleSelectPrompt = useCallback((name: string | null) => {
    setSelectedPrompt(name);
    setSelectedVersion(null);
    setVariableValues({});
    editor.exitEdit();
  }, [editor.exitEdit]);

  // Handle version selection - keep variable values if same variables exist
  const handleSelectVersion = useCallback((version: string | null) => {
    setSelectedVersion(version);
    editor.exitEdit();
  }, [editor.exitEdit]);

  // Handle variable value change
  const handleVariableChange = useCallback((key: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Run prompt
  const handleRun = useCallback(
    async (settings: { max_tokens: number; temperature: number }) => {
      if (!selectedModel) return;

      const promptName = selectedPrompt || `${activeCatalog}.${activeSchema}.${editor.newPromptName || 'draft'}`;
      const promptVersion = selectedVersion || 'draft';

      if (!editor.isEditing && (!selectedPrompt || !selectedVersion)) return;

      try {
        await run({
          prompt_name: promptName,
          prompt_version: promptVersion,
          variables: variableValues,
          model_name: selectedModel,
          max_tokens: settings.max_tokens,
          temperature: settings.temperature,
          experiment_name: experimentName || undefined,
          draft_template: editor.isEditing ? editor.draftTemplate : undefined,
        });
      } catch {
        // Error is captured in the hook
      }
    },
    [selectedPrompt, selectedVersion, selectedModel, variableValues, run,
     editor.isEditing, editor.draftTemplate, activeCatalog, activeSchema, editor.newPromptName, experimentName]
  );

  const handleReset = useCallback(() => {
    reset();
    setVariableValues({});
  }, [reset]);

  const canRun = !!(
    selectedModel &&
    !templateLoading &&
    (
      (!editor.isEditing && selectedPrompt && selectedVersion) ||
      (editor.isEditing && editor.draftTemplate.trim().length > 0)
    )
  );

  const unfilledVars = editor.activeVariables.filter(v => !variableValues[v]?.trim());

  if (configLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-databricks-red" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header
        experimentName={experimentName}
        experiments={experiments}
        experimentsLoading={experimentsLoading}
        onExperimentChange={handleExperimentChange}
      />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />


      <main className="flex-1 overflow-hidden">
        {activeTab === 'howto' && <HowToTab />}

        {/* Evaluate tab */}
        <div className={activeTab !== 'evaluate' ? 'hidden' : 'h-full'}>
          <EvaluatePanel
            evalCatalog={config?.eval_catalog ?? activeCatalog}
            evalSchema={config?.eval_schema ?? 'eval_data'}
            prompts={filteredPrompts}
            versions={versions}
            selectedPrompt={selectedPrompt}
            selectedVersion={selectedVersion}
            onSelectPrompt={handleSelectPrompt}
            onSelectVersion={handleSelectVersion}
            models={models}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            template={template}
            experimentName={experimentName}
          />
        </div>

        {/* Prompts tab — browse, manage, edit */}
        <div className={`h-full flex ${activeTab !== 'prompts' ? 'hidden' : ''}`}>
          {/* Left Panel - Prompt browser */}
          <div className="w-1/3 min-w-[280px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
            {/* Fixed top — registry */}
            <div className="flex-shrink-0 p-4 border-b border-gray-100">
              {/* Prompt Registry catalog/schema */}
              <div>
                <label className="section-label">Prompt Registry</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    className="text-sm border border-gray-200 rounded-md px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-databricks-red focus:border-transparent"
                    placeholder="catalog"
                    value={activeCatalog}
                    onChange={(e) => handleCatalogChange(e.target.value)}
                  />
                  <span className="text-gray-400 text-sm select-none">.</span>
                  <input
                    type="text"
                    className="text-sm border border-gray-200 rounded-md px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-databricks-red focus:border-transparent"
                    placeholder="schema"
                    value={activeSchema}
                    onChange={(e) => handleSchemaChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Experiment filter toggle — only shown when an experiment is selected */}
              {experimentName && (
                <label className="mt-3 flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterByExperiment}
                    onChange={(e) => setFilterByExperiment(e.target.checked)}
                    className="w-3 h-3 rounded accent-databricks-red"
                  />
                  <span className="text-xs text-gray-500">
                    Filter to experiment
                    {filterByExperiment && experimentPromptNames && (
                      <span className="text-gray-400"> ({filteredPrompts.length} of {prompts.length})</span>
                    )}
                  </span>
                </label>
              )}
            </div>

            {/* Flexible middle — PromptSelector grows to fill */}
            <div className="flex-1 overflow-hidden p-4">
              <PromptSelector
                prompts={filteredPrompts}
                promptsLoading={promptsLoading}
                promptsError={promptsError}
                selectedPrompt={selectedPrompt}
                onSelectPrompt={handleSelectPrompt}
                versions={versions}
                versionsLoading={versionsLoading}
                selectedVersion={selectedVersion}
                onSelectVersion={handleSelectVersion}
                onRefresh={refreshPrompts}
                onCreateNew={() => setShowCreatePrompt(true)}
              />
            </div>

            {/* Sticky footer — Test in Playground */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
              <button
                onClick={() => setActiveTab('playground')}
                disabled={!selectedPrompt || !selectedVersion}
                className="w-full py-2 px-4 rounded-md text-sm font-medium bg-databricks-red text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Test in Playground →
              </button>
            </div>
          </div>

          {/* Right Panel - Full-height PromptPreview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <PromptPreview
                template={editor.activeTemplate}
                variables={editor.activeVariables}
                values={variableValues}
                isEditing={editor.isEditing}
                isLatestVersion={!versions.length || !selectedVersion || selectedVersion === versions[0]?.version}
                onToggleEdit={editor.toggleEdit}
                draftTemplate={editor.draftTemplate}
                onDraftChange={editor.setDraftTemplate}
                onDraftVariablesChange={editor.setDraftVariables}
                onSave={editor.save}
                saveLoading={saveLoading || createLoading}
                saveError={saveError || createError}
                isDirty={editor.isDirty}
              />
            </div>
          </div>
        </div>

        {/* Playground tab — fill variables, run, iterate */}
        <div className={`h-full flex ${activeTab !== 'playground' ? 'hidden' : ''}`}>
          {/* Left Panel - Run controls */}
          <div className="w-1/3 min-w-[280px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Loaded prompt indicator */}
              <div>
                <label className="section-label">Prompt</label>
                {selectedPrompt && selectedVersion ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        {selectedPrompt.split('.').pop()}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">v{selectedVersion}</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('prompts')}
                      className="text-xs text-databricks-red hover:underline"
                    >
                      Change →
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveTab('prompts')}
                    className="text-sm text-databricks-red hover:underline"
                  >
                    Select a prompt →
                  </button>
                )}
              </div>

              {editor.activeVariables.length > 0 && (
                <VariableInputs
                  variables={editor.activeVariables}
                  values={variableValues}
                  onChange={handleVariableChange}
                />
              )}

              <ModelSelector
                models={models}
                loading={modelsLoading}
                error={modelsError}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                onRefresh={refreshModels}
                maxTokens={maxTokens}
                temperature={temperature}
                onMaxTokensChange={setMaxTokens}
                onTemperatureChange={setTemperature}
              />
            </div>

            {/* Sticky Run Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
              <RunControls
                canRun={canRun}
                loading={runLoading}
                onRun={handleRun}
                onReset={handleReset}
                unfilledVars={unfilledVars}
                maxTokens={maxTokens}
                temperature={temperature}
              />
            </div>
          </div>

          {/* Right Panel - Preview & Response */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview (top) */}
            <div className="h-3/5 min-h-[200px] border-b border-gray-200 overflow-hidden">
              <PromptPreview
                template={editor.activeTemplate}
                variables={editor.activeVariables}
                values={variableValues}
                isEditing={editor.isEditing}
                isLatestVersion={!versions.length || !selectedVersion || selectedVersion === versions[0]?.version}
                onToggleEdit={editor.toggleEdit}
                draftTemplate={editor.draftTemplate}
                onDraftChange={editor.setDraftTemplate}
                onDraftVariablesChange={editor.setDraftVariables}
                onSave={async (desc) => { await editor.save(desc); reset(); }}
                saveLoading={saveLoading || createLoading}
                saveError={saveError || createError}
                isDirty={editor.isDirty}
              />
            </div>

            {/* Response (bottom) */}
            <div className="flex-1 overflow-hidden">
              <ResponsePanel result={result} loading={runLoading} error={runError} />
            </div>
          </div>
        </div>
      </main>

      {showCreatePrompt && (
        <PromptForm
          catalog={activeCatalog}
          schema={activeSchema}
          onSaved={async (name, version) => {
            setShowCreatePrompt(false);
            await refreshPrompts();
            setSelectedPrompt(name);
            setSelectedVersion(version);
            setVariableValues({});
            editor.exitEdit();
          }}
          onCancel={() => setShowCreatePrompt(false)}
        />
      )}
    </div>
  );
}
