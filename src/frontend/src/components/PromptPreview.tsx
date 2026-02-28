import { Eye, Pencil, Save } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { parseTemplateVariables } from '../utils/templateUtils';

interface Props {
  template: string | null;
  variables: string[];
  values: Record<string, string>;
  isEditing: boolean;
  onToggleEdit: () => void;
  draftTemplate: string;
  onDraftChange: (template: string) => void;
  onDraftVariablesChange: (variables: string[]) => void;
  onSave: (description: string) => void;
  saveLoading: boolean;
  saveError: string | null;
  isDirty: boolean;
}

function renderPreview(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value || `{{${key}}}`);
  }
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function PromptPreview({
  template,
  variables,
  values,
  isEditing,
  onToggleEdit,
  draftTemplate,
  onDraftChange,
  onDraftVariablesChange,
  onSave,
  saveLoading,
  saveError,
  isDirty,
}: Props) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDescription, setSaveDescription] = useState('');
  const debounceRef = useRef<number>();

  // Debounce variable extraction as user types
  useEffect(() => {
    if (!isEditing) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onDraftVariablesChange(parseTemplateVariables(draftTemplate));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [draftTemplate, isEditing, onDraftVariablesChange]);

  // Empty state — no template selected and not creating new
  if (!template && !isEditing) {
    return (
      <div className="card h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Eye className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Select a prompt to see the preview
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Template variables will be highlighted as you fill them in
          </p>
        </div>
      </div>
    );
  }

  const handleSaveClick = () => {
    onSave(saveDescription);
    setSaveDescription('');
    setShowSaveDialog(false);
  };

  const activeVars = isEditing ? [] : variables; // In edit mode, parent tracks variables
  const filledCount = Object.values(values).filter(Boolean).length;

  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        {isEditing ? (
          <Pencil className="w-4 h-4 text-databricks-red" />
        ) : (
          <Eye className="w-4 h-4 text-gray-500" />
        )}
        <h3 className="text-sm font-semibold text-gray-700">
          {isEditing ? 'Edit Template' : 'Prompt Preview'}
        </h3>
        {isDirty && (
          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
            Draft
          </span>
        )}
        {!isEditing && activeVars.length > 0 && (
          <span className="text-[10px] text-gray-400 ml-auto mr-2">
            {filledCount}/{activeVars.length} variables filled
          </span>
        )}
        <div className={`${!isEditing && activeVars.length > 0 ? '' : 'ml-auto'} flex items-center gap-2`}>
          <button
            onClick={onToggleEdit}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            {isEditing ? (
              <>
                <Eye className="w-3 h-3" /> Preview
              </>
            ) : (
              <>
                <Pencil className="w-3 h-3" /> Edit
              </>
            )}
          </button>
          {isDirty && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="text-xs text-white bg-databricks-red hover:bg-red-700 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors"
            >
              <Save className="w-3 h-3" /> Register Version
            </button>
          )}
        </div>
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <textarea
            className="flex-1 text-sm font-mono bg-gray-50 rounded-lg p-4 resize-none border border-gray-200 focus:ring-2 focus:ring-databricks-red focus:border-databricks-red focus:outline-none"
            value={draftTemplate}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Enter your prompt template here. Use {{variable_name}} for variables."
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="flex-1 p-4 overflow-auto">
          <div
            className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4"
            dangerouslySetInnerHTML={{
              __html: renderPreview(
                isDirty ? draftTemplate : (template || ''),
                values
              ).replace(
                /\{\{\s*(\w+)\s*\}\}/g,
                '<span class="inline-block bg-amber-100 text-amber-800 rounded px-1 font-mono text-xs">{{$1}}</span>'
              ),
            }}
          />
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-2">
          <label className="text-xs font-medium text-gray-600">
            Version Description
          </label>
          <input
            type="text"
            value={saveDescription}
            onChange={(e) => setSaveDescription(e.target.value)}
            placeholder="What changed in this version?"
            className="w-full text-sm border border-gray-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-databricks-red focus:border-databricks-red"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveClick();
            }}
            autoFocus
          />
          {saveError && (
            <p className="text-xs text-red-600">{saveError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSaveClick}
              disabled={saveLoading}
              className="btn-primary text-xs py-1.5"
            >
              {saveLoading ? 'Saving...' : 'Register'}
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="btn-secondary text-xs py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
