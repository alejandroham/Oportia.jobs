import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Stage = 'loading' | 'login' | 'enroll' | 'verify' | 'not_admin' | 'ready';

/**
 * Doble seguridad: 1) correo y contraseña de Supabase Auth; 2) código de una app de autenticación (TOTP).
 * Solo con ambas (nivel aal2) y estando en admin_users, la base de datos entrega datos.
 */
export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [stage, setStage] = useState<Stage>('loading');

  const evaluate = async (s: Session | null) => {
    setSession(s);
    if (!s) return setStage('login');
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      return setStage((factors?.totp || []).some((f) => f.status === 'verified') ? 'verify' : 'enroll');
    }
    const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', s.user.id).maybeSingle();
    setStage(!error && data ? 'ready' : 'not_admin');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => evaluate(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cierre automático tras 30 minutos sin actividad.
  useEffect(() => {
    if (stage !== 'ready') return;
    let timer = window.setTimeout(() => supabase.auth.signOut(), 30 * 60_000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => supabase.auth.signOut(), 30 * 60_000);
    };
    const events = ['click', 'keydown', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [stage]);

  return { session, stage, refresh: () => supabase.auth.getSession().then(({ data }) => evaluate(data.session)) };
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card narrow"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) setError('Correo o contraseña incorrectos.');
      }}
    >
      <h1>Oportia · Administración</h1>
      <p className="muted">Acceso restringido. Paso 1 de 2: correo y contraseña.</p>
      <label>Correo<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Entrando…' : 'Continuar'}</button>
    </form>
  );
}

export function MfaStep({ enroll, onDone }: { enroll: boolean; onDone: () => void }) {
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (enroll) {
        // Limpia inscripciones a medias y crea una nueva.
        const { data: list } = await supabase.auth.mfa.listFactors();
        for (const f of list?.all || []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Oportia Admin' });
        if (error || !data) return setError('No se pudo iniciar la verificación en dos pasos.');
        setFactorId(data.id);
        setQr(data.totp.qr_code);
        setSecret(data.totp.secret);
      } else {
        const { data } = await supabase.auth.mfa.listFactors();
        const f = (data?.totp || []).find((x) => x.status === 'verified');
        if (f) setFactorId(f.id);
      }
    })();
  }, [enroll]);

  return (
    <form
      className="card narrow"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
        if (chErr || !ch) return setError('No se pudo validar. Intenta de nuevo.');
        const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
        if (error) return setError('Código incorrecto o vencido.');
        onDone();
      }}
    >
      <h1>Verificación en dos pasos</h1>
      {enroll ? (
        <>
          <p className="muted">Paso 2 de 2 (solo la primera vez): escanea este código con una app de autenticación (Google Authenticator, Microsoft Authenticator, 1Password…) y escribe el código de 6 dígitos.</p>
          {qr && <img src={qr} alt="Código QR para la app de autenticación" width={180} height={180} />}
          {secret && <p className="muted small">¿No puedes escanear? Clave: <code>{secret}</code></p>}
        </>
      ) : (
        <p className="muted">Paso 2 de 2: escribe el código de 6 dígitos de tu app de autenticación.</p>
      )}
      <label>Código<input inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></label>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={!factorId}>Verificar</button>
      <button type="button" className="link" onClick={() => supabase.auth.signOut()}>Salir</button>
    </form>
  );
}
