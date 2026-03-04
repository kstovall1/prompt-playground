import { Eye, Pencil, Save, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { parseTemplateVariables, parseSystemUser, buildXmlTemplate } from '../utils/templateUtils';

type InputMode = 'chat' | 'raw';

interface Props {
  template: string | null;
  variables: string[];
  values: Record<string, string>;
  isEditing: boolean;
  isLatestVersion: boolean;
  onToggleEdit: () => void;
  draftTemplate: string;
  onDraftChange: (template: string) => void;
  onDraftVariablesChange: (variables: string[]) => void;
  onSave: (description: string) => void;
  saveLoading: boolean;
  saveError: string | null;
  isDirty: boolean;
}

function highlightVars(tpl: string, values: Record<string, string>): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(tpl).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const val = values[key.trim()];
    const display = val ? esc(val) : `{{${key.trim()}}}`;
    return `<span class="inline-block bg-purple-100 text-purple-700 rounded px-1 font-mono text-xs">${display}</span>`;
  });
}

export default function PromptPreview({
  template,
  variables,
  values,
  isEditing,
  isLatestVersion,
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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [saveDescription, setSaveDescription] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('chat');
  const [previewMode, setPreviewMode] = useState<InputMode>('raw');
  const [localSystem, setLocalSystem] = useState('');
  const [localUser, setLocalUser] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const debounceRef = useRef<number>();

  const { system: draftSystem, user: draftUser } = parseSystemUser(draftTemplate);
  const hasEmptyUser = draftSystem !== null && !draftUser.trim();

  // Determine if the preview source has a system prompt (for the Chat/Raw toggle)
  const previewSrc = !isEditing ? (isDirty ? draftTemplate : (template || '')) : '';
  const hasSystemPrompt = !!parseSystemUser(previewSrc).system;

  // Auto-set preview mode when system prompt presence changes or edit mode exits
  useEffect(() => {
    if (!isEditing) {
      setPreviewMode(hasSystemPrompt ? 'chat' : 'raw');
    }
  }, [hasSystemPrompt, isEditing]);

  // When entering edit mode, initialize chat fields from draftTemplate and reset to chat mode.
  // Intentionally only fires on isEditing transitions to avoid resetting on each keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isEditing) {
      const parsed = parseSystemUser(draftTemplate);
      setLocalSystem(parsed.system ?? '');
      setLocalUser(parsed.user);
      setInputMode('chat');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // Debounce variable extraction as user types (draftTemplate is kept in sync in all modes)
  useEffect(() => {
    if (!isEditing) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onDraftVariablesChange(parseTemplateVariables(draftTemplate));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [draftTemplate, isEditing, onDraftVariablesChange]);

  // Clear inline register error when the template changes
  useEffect(() => { setRegisterError(null); }, [draftTemplate]);

  const switchMode = (next: InputMode) => {
    if (next === inputMode) return;
    if (next === 'raw') {
      // draftTemplate is already up-to-date (synced via onDraftChange from chat handlers)
      setInputMode('raw');
    } else {
      // Parse current raw textarea back into chat fields
      const parsed = parseSystemUser(draftTemplate);
      setLocalSystem(parsed.system ?? '');
      setLocalUser(parsed.user);
      setInputMode('chat');
    }
  };

  const handleSystemChange = (val: string) => {
    setLocalSystem(val);
    onDraftChange(buildXmlTemplate(val, localUser));
  };

  const handleUserChange = (val: string) => {
    setLocalUser(val);
    onDraftChange(buildXmlTemplate(localSystem, val));
  };

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
          {isEditing ? 'New Version' : 'Prompt Preview'}
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
          {!isEditing && template !== null && (
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
              <button
                onClick={() => setPreviewMode('chat')}
                disabled={!hasSystemPrompt}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  previewMode === 'chat'
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Chat
              </button>
              <button
                onClick={() => setPreviewMode('raw')}
                className={`px-3 py-1.5 font-medium transition-colors border-l border-gray-200 ${
                  previewMode === 'raw'
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Raw
              </button>
            </div>
          )}
          {!isEditing && isLatestVersion && (
            <button
              onClick={onToggleEdit}
              className="text-xs flex items-center gap-1 transition-colors font-medium text-databricks-red hover:text-red-700"
            >
              <Plus className="w-3 h-3" /> New version
            </button>
          )}
          {isEditing && template !== null && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (isDirty) { setShowDiscardConfirm(true); return; }
                  onToggleEdit();
                }}
                className="text-xs text-gray-600 hover:text-gray-800 px-2.5 py-1 rounded-md font-medium transition-colors border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (hasEmptyUser) { setRegisterError('A prompt requires a non-empty user input.'); return; }
                  setRegisterError(null);
                  setShowSaveDialog(true);
                }}
                disabled={!isDirty}
                className="text-xs text-white bg-databricks-red hover:bg-red-700 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-3 h-3" /> Register Version
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
          {registerError && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">{registerError}</p>
          )}
          {/* Mode toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Input format</span>
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
              <button
                onClick={() => switchMode('chat')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  inputMode === 'chat'
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => switchMode('raw')}
                className={`px-3 py-1.5 font-medium transition-colors border-l border-gray-200 ${
                  inputMode === 'raw'
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Raw
              </button>
            </div>
          </div>

          {inputMode === 'chat' ? (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              {/* System */}
              <div className="flex flex-col flex-1 min-h-0">
                <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-1.5 px-1">
                  System <span className="font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
                </div>
                <textarea
                  className="flex-1 min-h-0 w-full text-sm font-mono bg-indigo-50/60 rounded-lg p-3 resize-none border border-indigo-100 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:outline-none"
                  value={localSystem}
                  onChange={(e) => handleSystemChange(e.target.value)}
                  placeholder="Define the model's persona or standing instructions. Use {{variable}} for variables."
                  spellCheck={false}
                />
              </div>
              {/* User */}
              <div className="flex flex-col flex-1 min-h-0">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                  User
                </div>
                <textarea
                  className="flex-1 w-full text-sm font-mono bg-gray-50 rounded-lg p-3 resize-none border border-gray-200 focus:ring-2 focus:ring-databricks-red focus:border-databricks-red focus:outline-none"
                  value={localUser}
                  onChange={(e) => handleUserChange(e.target.value)}
                  placeholder="The user-facing message. Use {{variable_name}} for variables."
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            <textarea
              className="flex-1 text-sm font-mono bg-gray-50 rounded-lg p-4 resize-none border border-gray-200 focus:ring-2 focus:ring-databricks-red focus:border-databricks-red focus:outline-none"
              value={draftTemplate}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder={`Enter your prompt template here. Use {{variable_name}} for variables.\n\nFor system/user separation use XML tags:\n\n<system>\nYou are a helpful assistant.\n</system>\n\n<user>\nAnswer this: {{question}}\n</user>`}
              spellCheck={false}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 p-4 overflow-auto">
          {(() => {
            const src = isDirty ? draftTemplate : (template || '');
            if (previewMode === 'raw') {
              return (
                <div
                  className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4"
                  dangerouslySetInnerHTML={{ __html: highlightVars(src, values) }}
                />
              );
            }
            const { system, user } = parseSystemUser(src);
            if (system !== null) {
              return (
                <div className="space-y-3">
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
                    <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-1.5">System</div>
                    <div
                      className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap font-mono"
                      dangerouslySetInnerHTML={{ __html: highlightVars(system, values) }}
                    />
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">User</div>
                    <div
                      className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap font-mono"
                      dangerouslySetInnerHTML={{ __html: highlightVars(user, values) }}
                    />
                  </div>
                </div>
              );
            }
            return (
              <div
                className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4"
                dangerouslySetInnerHTML={{ __html: highlightVars(src, values) }}
              />
            );
          })()}
        </div>
      )}

      {showDiscardConfirm && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="Your edits to this version will be lost."
          confirmLabel="Discard"
          variant="warning"
          onConfirm={() => { setShowDiscardConfirm(false); onToggleEdit(); }}
          onCancel={() => setShowDiscardConfirm(false)}
        />
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
              {saveLoading ? 'Registering...' : 'Register'}
            </button>
            <button
              onClick={() => { setShowSaveDialog(false); onToggleEdit(); }}
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
