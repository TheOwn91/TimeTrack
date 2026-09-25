import { useState } from 'react';
import { Home } from './components/Home';
import { MonthView } from './components/MonthView';
import { Projects } from './components/Projects';

type Tab = 'home' | 'month' | 'projects';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Start', icon: '⏱' },
  { id: 'month', label: 'Monat', icon: '📅' },
  { id: 'projects', label: 'Arbeitgeber', icon: '🏢' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  return (
    <div className="app">
      <header className="app-header">
        <h1>TimeTrack</h1>
      </header>
      <main>
        {tab === 'home' && <Home onOpenProjects={() => setTab('projects')} />}
        {tab === 'month' && <MonthView />}
        {tab === 'projects' && <Projects />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
