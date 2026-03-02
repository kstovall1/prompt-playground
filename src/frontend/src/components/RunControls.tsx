import { Play, RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  canRun: boolean;
  loading: boolean;
  onRun: (params: { max_tokens: number; temperature: number }) => void;
  onReset: () => void;
  unfilledVars?: string[];
  maxTokens: number;
  temperature: number;
}

export default function RunControls({ canRun, loading, onRun, onReset, unfilledVars = [], maxTokens, temperature }: Props) {
  return (
    <div className="space-y-3">
      {/* Unfilled variable warning */}
      {unfilledVars.length > 0 && (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            {unfilledVars.length === 1
              ? <>Variable <span className="font-mono font-medium">{unfilledVars[0]}</span> has no value</>
              : <>{unfilledVars.length} variables have no value: <span className="font-mono font-medium">{unfilledVars.join(', ')}</span></>
            }
          </span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onRun({ max_tokens: maxTokens, temperature })}
          disabled={!canRun || loading}
          className="btn-primary flex-1"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Prompt
            </>
          )}
        </button>
        <button
          onClick={onReset}
          className="btn-secondary"
          title="Reset response"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
