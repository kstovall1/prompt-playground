import { Fragment, useState } from 'react';
import { ChevronDown, ChevronUp, Star, Loader2, ExternalLink, Table2 } from 'lucide-react';
import type { EvalResponse, ScoreDetail } from '../../types';

function ScoreBadge({ score }: { score: number | string | null }) {
  if (score === null || score === undefined) return <span className="text-gray-300 text-xs">—</span>;
  if (typeof score === 'string') {
    const fractionMatch = score.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const num = parseInt(fractionMatch[1]);
      const den = parseInt(fractionMatch[2]);
      const ratio = den > 0 ? num / den : 0;
      const color = ratio === 1 ? 'text-green-600' : ratio >= 0.5 ? 'text-yellow-600' : 'text-red-500';
      return <span className={`font-semibold text-sm ${color}`}>{score} passed</span>;
    }
    const lower = score.toLowerCase();
    const color = ['yes', 'pass', 'true'].includes(lower)
      ? 'text-green-600'
      : ['no', 'fail', 'false'].includes(lower)
        ? 'text-red-500'
        : 'text-blue-600';
    return <span className={`font-semibold text-sm ${color}`}>{score}</span>;
  }
  const color = score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-500';
  return (
    <span className={`font-semibold text-sm flex items-center gap-0.5 ${color}`}>
      <Star className="w-3 h-3 fill-current" />
      {score.toFixed(1)}
    </span>
  );
}

function GuidelineChecklist({ details }: { details: ScoreDetail[] }) {
  return (
    <div className="space-y-2">
      {details.map((d, idx) => {
        const pass = typeof d.value === 'number'
          ? d.value >= 1
          : ['true', 'yes', 'pass', '1'].includes(String(d.value ?? '').toLowerCase());
        const match = d.name.match(/\/(\d+)$/);
        const label = match ? `Rule ${parseInt(match[1]) + 1}` : d.name;
        return (
          <div key={idx} className="flex gap-2.5 items-start">
            <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {pass ? '✓' : '✗'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700">{label}</p>
              {d.rationale && (
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{d.rationale}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  previewColumns: string[];
  previewRows: Record<string, string>[];
  previewLoading: boolean;
  variables: string[];
  columnMapping: Record<string, string>;
  result: EvalResponse | null;
  loading: boolean;
  maxRows: number;
  scorerName?: string | null;
}

export default function DatasetTable({
  previewColumns, previewRows, previewLoading,
  variables, columnMapping, result, loading, maxRows, scorerName,
}: Props) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const mappedCols = variables
    .filter(v => columnMapping[v])
    .map(v => ({ variable: v, column: columnMapping[v] }));

  // Before mapping is set, show raw columns from preview so the user can understand their data
  const showRaw = mappedCols.length === 0;
  const displayRows = previewRows.slice(0, maxRows);
  // Show skeleton rows while loading if we don't have data yet
  const rowCount = displayRows.length > 0 ? displayRows.length : (previewLoading ? maxRows : 0);

  const resultByIndex: Record<number, EvalResponse['results'][number]> = result
    ? Object.fromEntries(result.results.map(r => [r.row_index, r]))
    : {};

  // Extra cols: # + data cols + (Response + Score + expander if mapped)
  const colSpan = showRaw
    ? previewColumns.length + 1
    : mappedCols.length + 4;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Dataset Preview</span>
          {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
          {!previewLoading && displayRows.length > 0 && (
            <span className="text-xs text-gray-400">({displayRows.length} rows shown)</span>
          )}
        </div>
        {result && (
          <div className="flex items-center gap-4">
            {result.avg_score !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Avg {scorerName || 'quality'}:</span>
                <ScoreBadge score={result.avg_score} />
              </div>
            )}
            {result.experiment_url && (
              <a
                href={result.experiment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-databricks-red hover:underline font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                View in Experiment
              </a>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {rowCount === 0 && !previewLoading ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            No rows found in this table.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-400 w-8 select-none">#</th>
                {showRaw ? (
                  previewColumns.map(col => (
                    <th key={col} className="px-3 py-2.5 text-left font-semibold text-gray-500 max-w-[200px]">
                      {col}
                    </th>
                  ))
                ) : (
                  mappedCols.map(({ variable }) => (
                    <th key={variable} className="px-3 py-2.5 text-left font-semibold text-gray-500">
                      <span className="font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]">
                        {variable}
                      </span>
                    </th>
                  ))
                )}
                {!showRaw && (
                  <>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 min-w-[240px]">Response</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-24">Score</th>
                    <th className="w-8" />
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, i) => {
                const row = displayRows[i] ?? null;
                const rowResult = resultByIndex[i];
                const isExpanded = expandedRow === i;

                return (
                  <Fragment key={i}>
                    <tr className={`border-b border-gray-50 transition-colors ${
                      isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50/70'
                    }`}>
                      <td className="px-3 py-3 text-gray-400 font-mono text-[11px] select-none">{i + 1}</td>

                      {showRaw ? (
                        previewColumns.map(col => (
                          <td key={col} className="px-3 py-3 text-gray-700 max-w-[200px]">
                            {previewLoading || !row ? (
                              <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                            ) : (
                              <p className="truncate" title={row[col] ?? ''}>{row[col] ?? '—'}</p>
                            )}
                          </td>
                        ))
                      ) : (
                        <>
                          {mappedCols.map(({ variable, column }) => (
                            <td key={variable} className="px-3 py-3 text-gray-700 max-w-[200px]">
                              {previewLoading || !row ? (
                                <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                              ) : (
                                <p className="truncate" title={row[column] ?? ''}>{row[column] ?? '—'}</p>
                              )}
                            </td>
                          ))}

                          {/* Response */}
                          <td className="px-3 py-3 min-w-[240px] max-w-[400px]">
                            {loading && !rowResult ? (
                              <div className="flex items-center gap-1.5 text-gray-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Running...</span>
                              </div>
                            ) : rowResult ? (
                              <p className="text-gray-700 line-clamp-2 leading-relaxed">{rowResult.response}</p>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Score */}
                          <td className="px-3 py-3">
                            {rowResult ? (
                              <ScoreBadge score={rowResult.score} />
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Expand toggle */}
                          <td className="px-3 py-3 pr-4">
                            {rowResult && (
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : i)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                              >
                                {isExpanded
                                  ? <ChevronUp className="w-3.5 h-3.5" />
                                  : <ChevronDown className="w-3.5 h-3.5" />
                                }
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && rowResult && (
                      <tr className="bg-blue-50/20">
                        <td colSpan={colSpan} className="px-5 py-4 border-b border-blue-100">
                          <div className="space-y-3 max-w-3xl">
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                Input Variables
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(rowResult.variables).map(([k, v]) => (
                                  <span key={k} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
                                    <span className="font-mono text-purple-600">{k}</span>: {v}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                Full Response
                              </p>
                              <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 rounded-lg p-2.5">
                                {rowResult.response}
                              </p>
                            </div>

                            {(rowResult.score_details || rowResult.score_rationale) && (
                              <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                  Judge Output
                                </p>
                                <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                                  {rowResult.score_details && rowResult.score_details.length >= 1 ? (
                                    <GuidelineChecklist details={rowResult.score_details} />
                                  ) : (
                                    <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <ScoreBadge score={rowResult.score} />
                                      </div>
                                      {rowResult.score_rationale}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
