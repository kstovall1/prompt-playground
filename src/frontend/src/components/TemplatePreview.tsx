import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { PromptTemplate } from '../types';
import { parseSystemUser } from '../utils/templateUtils';

function highlight(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(text).replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (_, key) => `<span class="inline-block bg-purple-100 text-purple-700 rounded px-0.5 font-mono not-italic">{{${key}}}</span>`
  );
}

export default function TemplatePreview({ template }: { template: PromptTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const [rawMode, setRawMode] = useState(false);

  const src = (template.raw_template ?? template.template).replace(/\\n/g, '\n');
  const { system, user } = parseSystemUser(src);
  const hasPromptTags = system !== null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-600 flex-1">Prompt Preview</span>
        {expanded && hasPromptTags && (
          <div
            className="flex rounded border border-gray-200 overflow-hidden text-[10px] mr-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setRawMode(false)}
              className={`px-2 py-0.5 font-medium transition-colors ${!rawMode ? 'bg-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setRawMode(true)}
              className={`px-2 py-0.5 font-medium transition-colors border-l border-gray-200 ${rawMode ? 'bg-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Raw
            </button>
          </div>
        )}
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </div>
      {expanded && (
        <div className="bg-white">
          {!rawMode && hasPromptTags ? (
            <div className="px-3 py-2.5 space-y-2">
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-2.5">
                <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-1">System</div>
                <div
                  className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: highlight(system!) }}
                />
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">User</div>
                <div
                  className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: highlight(user) }}
                />
              </div>
            </div>
          ) : (
            <div
              className="px-3 py-2.5 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: highlight(src) }}
            />
          )}
        </div>
      )}
    </div>
  );
}
