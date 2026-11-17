import { useState } from 'react';
import { BarChart3, MessageSquareHeart, ShieldAlert, Briefcase, Activity, LogOut } from 'lucide-react';
import { configured, supabase } from './supabase';
import { LoginForm, MfaStep, useAdminSession } from './Auth';
import { Overview } from './pages/Overview';
import { FeedbackPage } from './pages/Feedback';
import { SecurityPage } from './pages/Security';
import { OffersPage } from './pages/Offers';
import { StatusPage } from './pages/Status';

const TABS = [
  { key: 'resumen', label: 'Uso', Icon: BarChart3, Page: Overview },
  { key: 'opiniones', label: 'Opiniones', Icon: MessageSquareHeart, Page: FeedbackPage },
  { key: 'seguridad', label: 'Seguridad', Icon: ShieldAlert, Page: SecurityPage },
  { key: 'ofertas', label: 'Ofertas', Icon: Briefcase, Page: OffersPage },
  { key: 'estado', label: 'Estado', Icon: Activity, Page: StatusPage }
] as const;

export default function App() {
  const { stage, session, refresh } = useAdminSession();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('resumen');

  if (!configured) return <main className="card narrow"><h1>Falta configuración</h1><p>Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.</p></main>;
  if (stage === 'loading') return <main className="center muted">Cargando…</main>;
  if (stage === 'login') return <main className="center"><LoginForm /></main>;
  if (stage === 'enroll' || stage === 'verify') return <main className="center"><MfaStep enroll={stage === 'enroll'} onDone={refresh} /></main>;
  if (stage === 'not_admin')
    return (
      <main className="center">
        <div className="card narrow">
          <h1>Sin acceso</h1>
          <p>Esta cuenta no es administradora de Oportia.</p>
          <button className="primary" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </main>
    );

  const Current = TABS.find((t) => t.key === tab)!.Page;
  return (
    <div className="shell">
      <header>
        <strong>Oportia · Administración</strong>
        <nav aria-label="Secciones">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} className={tab === key ? 'tab active' : 'tab'} onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined}>
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        <span className="muted small">{session?.user.email}</span>
        <button className="link" onClick={() => supabase.auth.signOut()}><LogOut size={16} aria-hidden="true" /> Salir</button>
      </header>
      <main><Current /></main>
    </div>
  );
}
