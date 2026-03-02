import { Bot, Loader2, AlertCircle, Zap, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { RunResponse } from '../types';

interface Props {
  result: RunResponse | null;
  loading: boolean;
  error: string | null;
}

export default function ResponsePanel({ result, loading, error }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="card h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-databricks-red animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium">Running prompt...</p>
          <p className="text-xs text-gray-400 mt-1">
            Waiting for model response
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Error</p>
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-4 py-3">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Bot className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Model response will appear here</p>
          <p className="text-xs text-gray-400 mt-1">
            Fill in the variables and click Run
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Bot className="w-4 h-4 text-green-600" />
        <h3 className="text-sm font-semibold text-gray-700">Response</h3>
        <div className="ml-auto flex items-center gap-3">
          {result.usage && result.usage.total_tokens && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Zap className="w-3 h-3" />
              {result.usage.total_tokens} tokens
            </span>
          )}
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy response"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <div className="response-content whitespace-pre-wrap">{result.response}</div>
      </div>
      {result.model && (
        <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
          <span>
            Model: {result.model}
            {result.usage?.prompt_tokens && (
              <span className="ml-3">
                Prompt: {result.usage.prompt_tokens} | Completion: {result.usage.completion_tokens}
              </span>
            )}
          </span>
          {result.experiment_url && (
            <a
              href={result.experiment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 border border-databricks-red/40 text-databricks-red text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"
              title={result.run_id ? `Run ID: ${result.run_id}` : undefined}
            >
              <ExternalLink className="w-3 h-3" />
              Open in Databricks
            </a>
          )}
        </div>
      )}
    </div>
  );
}
