import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { MonthView } from './components/MonthView';
import { Projects } from './components/Projects';
import { DEMO, demoState } from './lib/demo';
import { syncRunningStatus } from './lib/status';
import { useStore } from './lib/store';

type Tab = 'home' | 'month' | 'projects';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Start', icon: '⏱' },
  { id: 'month', label: 'Monat', icon: '📅' },
  { id: 'projects', label: 'Arbeitgeber', icon: '🏢' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [notice, setNotice] = useState<string | null>(null);
  const { state, replace } = useStore();

  // Benachrichtigung und Badge folgen dem Timer (auch nach Neustart der App)
  useEffect(() => {
    void syncRunningStatus(state);
  }, [state]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onNotice = (e: Event) => {
      setNotice((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setNotice(null), 5000);
    };
    window.addEventListener('timetrack-notice', onNotice);
    return () => {
      window.removeEventListener('timetrack-notice', onNotice);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>TimeTrack</h1>
        {DEMO && (
          <div className="demo-bar">
            <span>
              Demo · Stand{' '}
              {new Date(__BUILD_TIME__).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            <button className="link" onClick={() => replace(demoState())}>
              Zurücksetzen
            </button>
          </div>
        )}
      </header>
      <main>
        {tab === 'home' && <Home onOpenProjects={() => setTab('projects')} />}
        {tab === 'month' && <MonthView />}
        {tab === 'projects' && <Projects />}
      </main>
      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
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
