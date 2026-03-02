import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { PromptTemplate } from '../types';

function stripPromptTags(text: string): string {
  return text.replace(/<\/?(?:system|user)>\n?/g, '').trimStart();
}

export default function TemplatePreview({ template }: { template: PromptTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const [rawMode, setRawMode] = useState(false);

  const src = template.raw_template ?? template.template;
  const hasPromptTags = /<(?:system|user)>/.test(src);
  const normalizedTemplate = src.replace(/\\n/g, '\n');
  const displayText = rawMode || !hasPromptTags ? normalizedTemplate : stripPromptTags(normalizedTemplate);

  const highlighted = displayText.replace(
    /\{\{(\s*\w+\s*)\}\}/g,
    '<mark class="bg-purple-100 text-purple-700 rounded px-0.5 not-italic">{{$1}}</mark>'
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-600 flex-1">Prompt Preview</span>
        {expanded && hasPromptTags && (
          <button
            onClick={(e) => { e.stopPropagation(); setRawMode(!rawMode); }}
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors mr-1 ${
              rawMode
                ? 'bg-gray-200 text-gray-700'
                : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-700'
            }`}
            title={rawMode ? 'Hide XML tags' : 'Show raw template with XML tags'}
          >
            Raw
          </button>
        )}
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        }
      </div>
      {expanded && (
        <div
          className="px-3 py-2.5 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-white"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      )}
    </div>
  );
}
