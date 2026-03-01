import { Variable, AlertTriangle } from 'lucide-react';

const MAX_LEN = 50_000;
const WARN_LEN = 40_000;
const TEMPLATE_RE = /\{\{\s*\w+\s*\}\}/;

interface Props {
  variables: string[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function VariableInputs({ variables, values, onChange }: Props) {
  if (variables.length === 0) return null;

  return (
    <div>
      <label className="section-label">Template Variables</label>
      <div className="space-y-3">
        {variables.map((varName) => {
          const val = values[varName] || '';
          const tooLong = val.length > MAX_LEN;
          const nearLimit = !tooLong && val.length > WARN_LEN;
          const hasInjection = TEMPLATE_RE.test(val);
          const hasWarning = tooLong || nearLimit || hasInjection;

          return (
            <div key={varName}>
              <div className="flex items-center gap-1.5 mb-1">
                <Variable className="w-3 h-3 text-databricks-red" />
                <label
                  htmlFor={`var-${varName}`}
                  className="text-sm font-medium text-gray-700"
                >
                  {varName}
                </label>
                {val.length > WARN_LEN && (
                  <span className={`ml-auto text-[10px] ${tooLong ? 'text-red-500' : 'text-amber-600'}`}>
                    {val.length.toLocaleString()} / {MAX_LEN.toLocaleString()}
                  </span>
                )}
              </div>
              <textarea
                id={`var-${varName}`}
                className={`input-field resize-none ${tooLong ? 'border-red-300 focus:ring-red-300' : ''}`}
                rows={2}
                placeholder={`Enter value for {{${varName}}}`}
                value={val}
                onChange={(e) => onChange(varName, e.target.value)}
              />
              {hasWarning && (
                <div className="mt-1 space-y-0.5">
                  {tooLong && (
                    <p className="flex items-center gap-1 text-[11px] text-red-500">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Exceeds {MAX_LEN.toLocaleString()}-character limit — run will be rejected.
                    </p>
                  )}
                  {nearLimit && (
                    <p className="flex items-center gap-1 text-[11px] text-amber-600">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Approaching {MAX_LEN.toLocaleString()}-character limit.
                    </p>
                  )}
                  {hasInjection && (
                    <p className="flex items-center gap-1 text-[11px] text-amber-600">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Value contains <code className="font-mono bg-amber-50 px-0.5 rounded">{"{{...}}"}</code> — these will be treated as literal text, not variables.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
