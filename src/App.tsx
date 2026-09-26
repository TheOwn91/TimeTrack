import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { MonthView } from './components/MonthView';
import { Projects } from './components/Projects';
import { WhatsNew } from './components/WhatsNew';
import { YearView } from './components/YearView';
import { CHANGELOG, pendingReleaseNotes, type Release } from './lib/changelog';
import { DEMO, demoState } from './lib/demo';
import { syncRunningStatus } from './lib/status';
import { useStore } from './lib/store';
import { applyUpdate, consumeForcedReleaseNotes, getUpdateStatus, onUpdateStatus } from './lib/update';

type Tab = 'home' | 'month' | 'year' | 'projects';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Start', icon: '⏱' },
  { id: 'month', label: 'Monat', icon: '📅' },
  { id: 'year', label: 'Jahr', icon: '📊' },
  { id: 'projects', label: 'Einstellungen', icon: '⚙️' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [notice, setNotice] = useState<string | null>(null);
  // „Was ist neu?“ nach einem Update (einmal beim Start ermittelt)
  const [whatsNew, setWhatsNew] = useState<{ releases: Release[]; afterUpdate: boolean } | null>(() => {
    const releases = pendingReleaseNotes(consumeForcedReleaseNotes());
    return releases.length ? { releases, afterUpdate: true } : null;
  });
  const { state, replace } = useStore();
  const [update, setUpdate] = useState(getUpdateStatus);
  useEffect(() => onUpdateStatus(setUpdate), []);

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
      {update.state === 'available' && (
        <div className="update-bar" role="status">
          <span>
            Update{update.release ? ` auf ${update.release.version}` : ''} verfügbar
          </span>
          <button className="btn primary" onClick={() => void applyUpdate()}>
            Jetzt aktualisieren
          </button>
        </div>
      )}
      {update.state === 'installing' && <div className="update-bar">Update wird installiert …</div>}
      <main>
        {tab === 'home' && <Home onOpenProjects={() => setTab('projects')} />}
        {tab === 'month' && <MonthView />}
        {tab === 'year' && <YearView />}
        {tab === 'projects' && <Projects onShowWhatsNew={() => setWhatsNew({ releases: CHANGELOG, afterUpdate: false })} />}
      </main>
      {whatsNew && (
        <WhatsNew releases={whatsNew.releases} afterUpdate={whatsNew.afterUpdate} onClose={() => setWhatsNew(null)} />
      )}
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
