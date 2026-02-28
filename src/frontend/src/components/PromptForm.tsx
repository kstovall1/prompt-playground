import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { useCreatePrompt } from '../hooks/useApi';

interface Props {
  catalog: string;
  schema: string;
  onSaved: (name: string, version: string) => void;
  onCancel: () => void;
}

export default function PromptForm({ catalog, schema, onSaved, onCancel }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userTemplate, setUserTemplate] = useState('');
  const { create, loading, error } = useCreatePrompt();

  const fullName = `${catalog}.${schema}.${name.trim() || '<name>'}`;
  const isValid = name.trim().length > 0 && userTemplate.trim().length > 0;

  const buildTemplate = () => {
    const sys = systemPrompt.trim();
    const user = userTemplate.trim();
    if (sys) {
      return `<system>\n${sys}\n</system>\n\n<user>\n${user}\n</user>`;
    }
    return user;
  };

  const handleSave = async () => {
    try {
      const result = await create({
        name: `${catalog}.${schema}.${name.trim()}`,
        template: buildTemplate(),
        description: description.trim(),
      });
      onSaved(result.name, result.version);
    } catch {
      // error captured in hook
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onCancel} />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Create a Prompt</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Register a new prompt in the Unity Catalog Prompt Registry.
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Prompt Name <span className="text-databricks-red">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. customer_support_reply"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-databricks-red focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              Lowercase letters, numbers, and underscores only. Will be registered as{' '}
              <span className="font-mono text-gray-500">{fullName}</span>
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="What does this prompt do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-databricks-red focus:border-transparent"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              System Prompt{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              placeholder={`Define the model's persona or standing instructions.\n\nExample:\nYou are a concise, helpful assistant. Always respond in {{language}}.`}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              className="w-full text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none bg-indigo-50/40"
            />
          </div>

          {/* User Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              User Template <span className="text-databricks-red">*</span>
            </label>
            <textarea
              placeholder={`The user-facing message with dynamic variables.\n\nExample:\nAnswer the following question clearly:\n\n{{question}}`}
              value={userTemplate}
              onChange={(e) => setUserTemplate(e.target.value)}
              rows={7}
              className="w-full text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-databricks-red focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Use{' '}
              <span className="font-mono bg-gray-100 px-1 rounded text-gray-600">
                {'{{variable_name}}'}
              </span>{' '}
              in either field to define template variables filled in at run time.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!isValid || loading}
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-databricks-red text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            ) : (
              <><Plus className="w-4 h-4" /> Create Prompt</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
