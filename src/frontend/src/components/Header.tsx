import { PenLine, Settings } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface Props {
  experimentName: string;
  experiments: { name: string }[];
  experimentsLoading: boolean;
  onExperimentChange: (name: string) => void;
  onOpenSettings: () => void;
  filterByExperiment: boolean;
  onFilterChange: (v: boolean) => void;
  experimentPromptsLoading: boolean;
  filteredCount: number;
  totalCount: number;
}

export default function Header({
  experimentName,
  experiments,
  experimentsLoading,
  onExperimentChange,
  onOpenSettings,
  filterByExperiment,
  onFilterChange,
  experimentPromptsLoading,
  filteredCount,
  totalCount,
}: Props) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left — logo + title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-databricks-red">
              <PenLine className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              Prompt Playground
            </h1>
          </div>

          {/* Right — experiment context + status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Experiment
              </span>
              <div className="w-80">
                <SearchableSelect
                  value={experimentName}
                  onChange={onExperimentChange}
                  disabled={experimentsLoading}
                  placeholder={experimentsLoading ? 'Loading...' : 'Select an experiment...'}
                  allowClear={false}
                  options={experiments.map((e) => ({ value: e.name, label: e.name }))}
                />
              </div>
            </div>

            <label className={`flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap${!experimentName ? ' invisible pointer-events-none' : ''}`}>
              <input
                type="checkbox"
                checked={filterByExperiment}
                onChange={(e) => onFilterChange(e.target.checked)}
                className="w-3 h-3 rounded accent-databricks-red"
              />
              <span className="text-xs text-gray-500">
                Filter prompts to experiment
                {filterByExperiment && (
                  experimentPromptsLoading
                    ? <span className="text-gray-400"> (…)</span>
                    : <span className="text-gray-400"> ({filteredCount}/{totalCount})</span>
                )}
              </span>
            </label>

            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              Connected
            </span>

            <button
              onClick={onOpenSettings}
              title="App settings"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
