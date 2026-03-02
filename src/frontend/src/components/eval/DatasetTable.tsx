import { Fragment, useState } from 'react';
import { ChevronDown, ChevronUp, Star, Loader2, Table2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import type { EvalResponse, ScoreDetail, PromptTemplate } from '../../types';
import { parseSystemUser } from '../../utils/templateUtils';

function highlightVars(tpl: string, vars: Record<string, string>): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(tpl).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const val = vars[key.trim()];
    const display = val ? esc(val) : `{{${key.trim()}}}`;
    return `<span class="inline-block bg-purple-100 text-purple-700 rounded px-1 font-mono text-xs">${display}</span>`;
  });
}

function isLowScore(score: number | string | null): boolean {
  if (score === null || score === undefined) return false;
  if (typeof score === 'number') return score < 3.0;
  const fractionMatch = score.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const den = parseInt(fractionMatch[2]);
    return den > 0 && num / den < 0.5;
  }
  const lower = score.toLowerCase();
  return ['no', 'fail', 'false'].includes(lower);
}

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
  template: PromptTemplate | null;
}

export default function DatasetTable({
  previewColumns, previewRows, previewLoading,
  variables, columnMapping, result, loading, maxRows, scorerName, template,
}: Props) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [copied, setCopied] = useState(false);

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

  function toSortKey(score: number | string | null): number {
    if (score === null || score === undefined) return Infinity;
    if (typeof score === 'number') return score;
    const fractionMatch = score.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const den = parseInt(fractionMatch[2]);
      return den > 0 ? parseInt(fractionMatch[1]) / den : Infinity;
    }
    const lower = score.toLowerCase();
    if (['yes', 'pass', 'true'].includes(lower)) return 1;
    if (['no', 'fail', 'false'].includes(lower)) return 0;
    return Infinity;
  }

  const rowIndices = Array.from({ length: rowCount }, (_, i) => i);
  if (sortDir && result) {
    rowIndices.sort((a, b) => {
      const ka = toSortKey(resultByIndex[a]?.score ?? null);
      const kb = toSortKey(resultByIndex[b]?.score ?? null);
      return sortDir === 'asc' ? ka - kb : kb - ka;
    });
  }

  const handleSortClick = () => {
    setSortDir(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null);
    setExpandedRow(null);
  };

  function rationaleSummary(r: EvalResponse['results'][number]): string | null {
    if (r.score_details && r.score_details.length > 0) {
      const passed = r.score_details.filter(d => {
        const v = d.value;
        return typeof v === 'number' ? v >= 1 : ['true', 'yes', 'pass', '1'].includes(String(v ?? '').toLowerCase());
      }).length;
      return `${passed} of ${r.score_details.length} guidelines passed`;
    }
    if (r.score_rationale) {
      const first = r.score_rationale.split(/[.!?]/)[0].trim();
      return first.length > 160 ? first.slice(0, 160) + '…' : first;
    }
    return null;
  }

  const showResults = !showRaw && !!result;
  // Preview mode: mapping set, template loaded, no result yet
  const canPreviewPrompt = !showRaw && !showResults && !!template && mappedCols.length > 0;

  // colSpan for expanded detail row
  const colSpan = showRaw
    ? previewColumns.length + 1
    : showResults
      ? 6                              // # + input + response + score + reasoning + expander
      : canPreviewPrompt
        ? mappedCols.length + 2        // # + vars + expander
        : mappedCols.length + 1;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-gray-400" />
          <span className={`text-sm font-semibold ${loading ? 'text-amber-600' : 'text-gray-700'}`}>
            {loading ? 'Running Evaluation' : result ? 'Evaluation Results' : 'Dataset Preview'}
          </span>
          {(previewLoading || loading) && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
          {!previewLoading && !loading && result && (
            <span className="text-xs text-gray-400">({result.results.length} of {result.total_rows} rows evaluated)</span>
          )}
          {!previewLoading && !loading && !result && displayRows.length > 0 && (
            <span className="text-xs text-gray-400">({displayRows.length} rows shown)</span>
          )}
        </div>
        {result && !loading && result.experiment_url && (
          <a
            href={result.experiment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-databricks-red text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            <ExternalLink className="w-3 h-3" />
            Open in Databricks
          </a>
        )}
      </div>

      {/* Post-run summary banner */}
      {result && !loading && (() => {
        const passing = result.results.filter(r => !isLowScore(r.score)).length;
        const total = result.results.length;
        const distHint = total > 0 ? `${passing} of ${total} above threshold` : null;
        const copyRunId = () => {
          if (!result.run_id) return;
          navigator.clipboard.writeText(result.run_id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        };
        const promptShort = result.prompt_name.split('.').pop() ?? result.prompt_name;
        return (
          <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-700 truncate" title={result.prompt_name}>
                    {promptShort}
                  </span>
                  <span className="text-[11px] text-gray-400">v{result.prompt_version}</span>
                  <span className="text-gray-300 select-none">·</span>
                  <span className="text-[11px] text-gray-500 truncate">{result.model_name}</span>
                </div>
                {distHint && (
                  <p className="text-[11px] text-gray-400">{distHint}</p>
                )}
                {result.run_id && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400 font-medium">Run ID:</span>
                    <button
                      onClick={copyRunId}
                      className="flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <span className="truncate max-w-[220px]">{result.run_id}</span>
                      <span className="text-[10px] text-gray-300 ml-0.5">{copied ? '✓' : '⎘'}</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {result.avg_score !== null && (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Avg Score</p>
                    <p className={`text-2xl font-bold leading-none mt-0.5 ${
                      result.avg_score >= 4 ? 'text-green-600' : result.avg_score >= 3 ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {typeof result.avg_score === 'number' && result.avg_score <= 5
                        ? result.avg_score.toFixed(1)
                        : result.avg_score}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                ) : showResults ? (
                  <>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 min-w-[220px] w-[22%]">Input</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 min-w-[220px]">Response</th>
                    <th
                      className="px-3 py-2.5 text-left font-semibold text-gray-500 w-24 cursor-pointer select-none hover:text-gray-700"
                      onClick={handleSortClick}
                    >
                      <span className="flex items-center gap-1">
                        Score
                        {sortDir === 'asc' && <ArrowUp className="w-3 h-3 text-databricks-red" />}
                        {sortDir === 'desc' && <ArrowDown className="w-3 h-3 text-databricks-red" />}
                        {!sortDir && <ArrowUp className="w-3 h-3 text-gray-300" />}
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 min-w-[200px]">Judge Reasoning</th>
                    <th className="w-8" />
                  </>
                ) : (
                  <>
                    {mappedCols.map(({ variable }) => (
                      <th key={variable} className="px-3 py-2.5 text-left font-semibold text-gray-500">
                        <span className="font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]">
                          {variable}
                        </span>
                      </th>
                    ))}
                    {canPreviewPrompt && <th className="w-8" />}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rowIndices.map((i) => {
                const row = displayRows[i] ?? null;
                const rowResult = resultByIndex[i];
                const isExpanded = expandedRow === i;
                const lowScore = rowResult ? isLowScore(rowResult.score) : false;

                return (
                  <Fragment key={i}>
                    <tr
                      className={`border-b border-gray-50 transition-colors ${
                        showResults && rowResult ? 'cursor-pointer' : ''
                      } ${
                        isExpanded ? 'bg-blue-50/30' : lowScore ? 'bg-red-50/50 hover:bg-red-50/70' : 'hover:bg-gray-50/70'
                      }`}
                      onClick={showResults && rowResult ? () => setExpandedRow(isExpanded ? null : i) : undefined}
                    >
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
                      ) : showResults ? (
                        <>
                          {/* Input summary — all variables stacked */}
                          <td className="px-3 py-3 min-w-[220px] w-[22%] align-top">
                            <div className="space-y-1">
                              {(rowResult
                                ? Object.entries(rowResult.variables)
                                : mappedCols.map(({ variable, column }) => [variable, row?.[column] ?? ''] as [string, string])
                              ).map(([k, v]) => (
                                <div key={k} className="min-w-0">
                                  <div className="text-[10px] font-mono text-purple-500 truncate" title={k}>{k}:</div>
                                  <div className="text-[11px] text-gray-600 truncate" title={v || ''}>{v || '—'}</div>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Response */}
                          <td className="px-3 py-3 min-w-[220px] max-w-[360px] align-top">
                            {loading && !rowResult ? (
                              <div className="flex items-center gap-1.5 text-gray-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Running...</span>
                              </div>
                            ) : rowResult ? (
                              <p className="text-gray-700 line-clamp-3 leading-relaxed">{rowResult.response}</p>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Score */}
                          <td className="px-3 py-3 align-top">
                            {rowResult ? <ScoreBadge score={rowResult.score} /> : <span className="text-gray-300 text-xs">—</span>}
                          </td>

                          {/* Judge reasoning snippet */}
                          <td className="px-3 py-3 min-w-[200px] max-w-[320px] align-top">
                            {loading && !rowResult ? (
                              <div className="h-3 bg-gray-200 rounded animate-pulse w-32 mt-0.5" />
                            ) : rowResult ? (
                              <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
                                {rationaleSummary(rowResult) ?? <span className="text-gray-300">—</span>}
                              </p>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Expand indicator */}
                          <td className="px-3 py-3 pr-4 align-top">
                            {rowResult && (
                              <span className="text-gray-400">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </span>
                            )}
                          </td>
                        </>
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
                          {canPreviewPrompt && (
                            <td className="px-3 py-3 pr-4">
                              {row && (
                                <button
                                  onClick={() => setExpandedRow(isExpanded ? null : i)}
                                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap"
                                  aria-label={isExpanded ? 'Collapse row' : 'Preview rendered prompt'}
                                >
                                  {isExpanded
                                    ? <ChevronUp className="w-3.5 h-3.5" />
                                    : <><ChevronDown className="w-3.5 h-3.5" /><span className="text-[11px]">Preview prompt</span></>
                                  }
                                </button>
                              )}
                            </td>
                          )}
                        </>
                      )}
                    </tr>

                    {/* Expanded prompt preview — preview mode only (no eval result yet) */}
                    {isExpanded && canPreviewPrompt && !rowResult && row && (() => {
                      const vars = Object.fromEntries(
                        mappedCols.map(({ variable, column }) => [variable, row[column] ?? ''])
                      );
                      const { system, user } = parseSystemUser(template!.raw_template);
                      return (
                        <tr className="bg-purple-50/20">
                          <td colSpan={colSpan} className="px-5 py-4 border-b border-purple-100">
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                Rendered Prompt Preview
                              </p>
                              {system && (
                                <div>
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">System</span>
                                  <div className="mt-1 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 rounded-lg p-2.5 font-mono max-h-48 overflow-y-auto"
                                    dangerouslySetInnerHTML={{ __html: highlightVars(system, vars) }}
                                  />
                                </div>
                              )}
                              <div>
                                {system && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">User</span>}
                                <div
                                  className={`text-xs text-gray-600 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 rounded-lg p-2.5 font-mono max-h-48 overflow-y-auto ${system ? 'mt-1' : ''}`}
                                  dangerouslySetInnerHTML={{ __html: highlightVars(user, vars) }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Expanded detail row */}
                    {isExpanded && rowResult && (
                      <tr className="bg-blue-50/20">
                        <td colSpan={colSpan} className="px-5 py-4 border-b border-blue-100">
                          <div className="space-y-3">
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

                            {(rowResult.rendered_prompt || rowResult.rendered_system_prompt) && (() => {
                              const { system: sysTpl, user: userTpl } = template
                                ? parseSystemUser(template.raw_template)
                                : { system: rowResult.rendered_system_prompt ?? null, user: rowResult.rendered_prompt ?? '' };
                              const vars = rowResult.variables;
                              return (
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                    Rendered Prompt
                                  </p>
                                  <div className="space-y-1.5">
                                    {sysTpl && (
                                      <div>
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">System</span>
                                        <div className="mt-1 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50 border border-gray-100 rounded-lg p-2.5 font-mono max-h-40 overflow-y-auto"
                                          dangerouslySetInnerHTML={{ __html: highlightVars(sysTpl, vars) }}
                                        />
                                      </div>
                                    )}
                                    {userTpl && (
                                      <div>
                                        {sysTpl && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">User</span>}
                                        <div
                                          className={`text-xs text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50 border border-gray-100 rounded-lg p-2.5 font-mono max-h-40 overflow-y-auto ${sysTpl ? 'mt-1' : ''}`}
                                          dangerouslySetInnerHTML={{ __html: highlightVars(userTpl, vars) }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

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
