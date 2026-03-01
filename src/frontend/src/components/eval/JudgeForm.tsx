import { useState, useEffect, useRef } from 'react';
import { CheckCircle, ChevronDown, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useCreateJudge, useJudgeDetail } from '../../hooks/useEvalApi';

type JudgeType = 'custom' | 'guidelines';

const VARIABLES = [
  { label: '{{ inputs }}', value: '{{ inputs }}', description: 'The prompt sent to the model' },
  { label: '{{ outputs }}', value: '{{ outputs }}', description: "The model's response" },
  { label: '{{ trace }}', value: '{{ trace }}', description: 'The full MLflow trace for the request' },
  { label: '{{ expectations }}', value: '{{ expectations }}', description: 'Expected output for comparison' },
];

interface Props {
  experimentName: string;
  editingJudge?: string | null;
  onSaved: (name: string) => void;
  onCancel: () => void;
}

export default function JudgeForm({ experimentName, editingJudge, onSaved, onCancel }: Props) {
  const isEdit = !!editingJudge;
  const [name, setName] = useState(editingJudge || '');
  const [judgeType, setJudgeType] = useState<JudgeType>('custom');
  const [instructions, setInstructions] = useState('');
  const [guidelines, setGuidelines] = useState<string[]>(['']);
  const [savedOk, setSavedOk] = useState(false);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const varMenuRef = useRef<HTMLDivElement>(null);
  const { create, loading, error } = useCreateJudge();
  const { detail, loading: detailLoading } = useJudgeDetail(editingJudge ?? null);

  useEffect(() => {
    if (!detail) return;
    setJudgeType(detail.type);
    if (detail.type === 'custom' && detail.instructions) {
      setInstructions(detail.instructions);
    } else if (detail.type === 'guidelines' && detail.guidelines?.length) {
      setGuidelines(detail.guidelines);
    }
  }, [detail]);

  // Close variable menu on outside click
  useEffect(() => {
    if (!showVarMenu) return;
    const handler = (e: MouseEvent) => {
      if (varMenuRef.current && !varMenuRef.current.contains(e.target as Node)) {
        setShowVarMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showVarMenu]);

  const insertVariable = (variable: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? instructions.length;
    const end = el.selectionEnd ?? instructions.length;
    const next = instructions.slice(0, start) + variable + instructions.slice(end);
    setInstructions(next);
    setShowVarMenu(false);
    // Restore focus and move cursor after inserted text
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    });
  };

  const handleSave = async () => {
    setSavedOk(false);
    try {
      const params: Record<string, unknown> = {
        name: name.trim(),
        type: judgeType,
        experiment_name: experimentName || undefined,
        is_update: isEdit,
      };
      if (judgeType === 'custom') {
        params.instructions = instructions.trim();
      } else {
        params.guidelines = guidelines.map((g) => g.trim()).filter(Boolean);
      }
      await create(params as Parameters<typeof create>[0]);
      if (isEdit) setSavedOk(true);
      onSaved(name.trim());
    } catch {
      /* error captured in hook */
    }
  };

  const addGuideline = () => { setSavedOk(false); setGuidelines((prev) => [...prev, '']); };
  const removeGuideline = (idx: number) => { setSavedOk(false); setGuidelines((prev) => prev.filter((_, i) => i !== idx)); };
  const updateGuideline = (idx: number, val: string) => { setSavedOk(false); setGuidelines((prev) => prev.map((g, i) => (i === idx ? val : g))); };

  const nameError = null;

  const isValid =
    name.trim().length > 0 &&
    (judgeType === 'custom'
      ? instructions.trim().length > 0
      : guidelines.some((g) => g.trim().length > 0));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onCancel}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Edit Judge' : 'Create a Judge'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              A judge is an AI that scores your model's responses during evaluation.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {detailLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading judge details...
            </div>
          ) : (
            <>
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Judge Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tone Check, GuidelinesKT"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  readOnly={isEdit}
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent ${
                    isEdit
                      ? 'border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed'
                      : nameError
                        ? 'border-red-300 focus:ring-red-300'
                        : 'border-gray-300 focus:ring-databricks-red'
                  }`}
                />
                {!isEdit && (
                  nameError
                    ? <p className="mt-1 text-xs text-red-500">{nameError}</p>
                    : <p className="mt-1 text-xs text-gray-400">Any name works — spaces and uppercase are allowed.</p>
                )}
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Judge Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setSavedOk(false); setJudgeType('custom'); }}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      judgeType === 'custom'
                        ? 'border-databricks-red bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${judgeType === 'custom' ? 'text-databricks-red' : 'text-gray-700'}`}>
                      Custom
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Write free-form instructions for what to evaluate
                    </p>
                  </button>
                  <button
                    onClick={() => { setSavedOk(false); setJudgeType('guidelines'); }}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      judgeType === 'guidelines'
                        ? 'border-databricks-red bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${judgeType === 'guidelines' ? 'text-databricks-red' : 'text-gray-700'}`}>
                      Guidelines
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Define a list of specific rules to check
                    </p>
                  </button>
                </div>
              </div>

              {/* Custom: instructions textarea */}
              {judgeType === 'custom' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Instructions
                    </label>
                    {/* Add variable dropdown */}
                    <div className="relative" ref={varMenuRef}>
                      <button
                        type="button"
                        onClick={() => setShowVarMenu((v) => !v)}
                        className="flex items-center gap-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-md px-2 py-1 hover:bg-gray-50 transition-colors"
                      >
                        Add variable <ChevronDown className="w-3 h-3" />
                      </button>
                      {showVarMenu && (
                        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                          {VARIABLES.map((v) => (
                            <button
                              key={v.value}
                              type="button"
                              onClick={() => insertVariable(v.value)}
                              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                            >
                              <span className="block text-xs font-mono font-semibold text-purple-700">{v.label}</span>
                              <span className="block text-xs text-gray-500 mt-0.5">{v.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    placeholder={`Evaluate if the response in {{ outputs }} correctly answers the question in {{ inputs }}. The response should be accurate, complete, and professional.`}
                    value={instructions}
                    onChange={(e) => { setSavedOk(false); setInstructions(e.target.value); }}
                    rows={8}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-databricks-red focus:border-transparent resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Use <code className="bg-gray-100 px-1 rounded">{'{{ inputs }}'}</code> for the prompt and <code className="bg-gray-100 px-1 rounded">{'{{ outputs }}'}</code> for the model response.
                  </p>
                </div>
              )}

              {/* Guidelines: list of rules */}
              {judgeType === 'guidelines' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Rules
                  </label>
                  <div className="space-y-2">
                    {guidelines.map((g, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder={`Rule ${idx + 1} — e.g. "Response must not contain profanity"`}
                          value={g}
                          onChange={(e) => updateGuideline(idx, e.target.value)}
                          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-databricks-red focus:border-transparent"
                        />
                        {guidelines.length > 1 && (
                          <button
                            onClick={() => removeGuideline(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addGuideline}
                      className="text-sm text-databricks-red hover:text-red-700 font-medium"
                    >
                      + Add another rule
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Each rule is checked independently. The score reflects how many rules the response passes.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {savedOk && (
          <div className="px-6 pt-3 -mb-1">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Judge updated — changes will apply to the next evaluation run.
            </div>
          </div>
        )}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!isValid || loading || detailLoading}
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-databricks-red text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {isEdit ? 'Updating...' : 'Creating...'}</>
            ) : isEdit ? (
              <><Save className="w-4 h-4" /> Update Judge</>
            ) : (
              <><Plus className="w-4 h-4" /> Create Judge</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
