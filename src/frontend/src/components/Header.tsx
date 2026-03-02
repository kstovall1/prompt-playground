import { PenLine } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface Props {
  experimentName: string;
  experiments: { name: string }[];
  experimentsLoading: boolean;
  onExperimentChange: (name: string) => void;
}

export default function Header({
  experimentName,
  experiments,
  experimentsLoading,
  onExperimentChange,
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
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                Prompt Playground
              </h1>
              <p className="text-[11px] text-gray-500 leading-tight">
                MLflow Prompt Registry
              </p>
            </div>
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
                  placeholder={experimentsLoading ? 'Loading...' : 'All experiments'}
                  options={experiments.map((e) => ({ value: e.name, label: e.name }))}
                />
              </div>
            </div>

            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              Connected
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
