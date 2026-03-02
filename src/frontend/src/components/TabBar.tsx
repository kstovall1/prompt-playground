import { FlaskConical, Play, BookOpen, Library } from 'lucide-react';

export type Tab = 'prompts' | 'playground' | 'evaluate' | 'howto';

const TABS: { id: Tab; label: string; icon: typeof Play }[] = [
  { id: 'prompts', label: 'Prompts', icon: Library },
  { id: 'playground', label: 'Playground', icon: Play },
  { id: 'evaluate', label: 'Evaluate', icon: FlaskConical },
  { id: 'howto', label: 'How to Use', icon: BookOpen },
];

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function TabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 flex gap-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === id
              ? 'border-databricks-red text-databricks-red'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
