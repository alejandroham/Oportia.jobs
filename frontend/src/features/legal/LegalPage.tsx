import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
// Los documentos se leen desde la raíz del repositorio: una sola fuente para GitHub y la app.
// Van dentro del paquete principal (no se cargan aparte), así se pueden abrir sin conexión desde la app.
import privacyMd from '../../../../PRIVACY.md?raw';
import termsMd from '../../../../TERMINOS.md?raw';
import { LegalDocument } from './LegalDocument';

export type LegalDocKind = 'privacidad' | 'terminos';

const DOCS: Record<LegalDocKind, { title: string; markdown: string; file: string; other: { kind: LegalDocKind; label: string } }> = {
  privacidad: { title: 'Política de privacidad', markdown: privacyMd, file: 'PRIVACY.md', other: { kind: 'terminos', label: 'Términos de uso' } },
  terminos: { title: 'Términos de uso', markdown: termsMd, file: 'TERMINOS.md', other: { kind: 'privacidad', label: 'Política de privacidad' } }
};

/** 1.6.3 (DT-08): /privacidad y /terminos dentro de la app (antes solo había un enlace a GitHub en Opinión). */
export const LegalPage: React.FC<{ kind: LegalDocKind }> = ({ kind }) => {
  const doc = DOCS[kind];
  const { hash } = useLocation();

  useEffect(() => {
    const previous = document.title;
    document.title = `${doc.title} — Oportia Jobs IA`;
    // Al salir se devuelve el título anterior (si no, quedaba "Política de privacidad" en toda la app).
    return () => {
      document.title = previous;
    };
  }, [doc.title]);

  // Ir a la sección pedida (#9-opiniones-y-contacto-voluntario) o al inicio del documento.
  useEffect(() => {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
  }, [hash, kind]);

  const Icon = kind === 'privacidad' ? ShieldCheck : FileText;
  return (
    <article className="max-w-3xl mx-auto space-y-5" aria-labelledby="legal-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink dark:hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Volver al inicio
        </Link>
        <Link to={`/${doc.other.kind}`} className="text-xs font-semibold text-brand-700 dark:text-brand-300 underline">
          {doc.other.label}
        </Link>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <p id="legal-title" className="text-sm font-semibold text-ink-muted">{doc.title}</p>
      </div>
      <div className="p-5 sm:p-8 rounded-2xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border shadow-sm">
        <LegalDocument markdown={doc.markdown} />
      </div>
      <p className="text-xs text-ink-muted text-center">
        Este documento también está en{' '}
        <a href={`https://github.com/alejandroham/Oportia.jobs/blob/main/${doc.file}`} target="_blank" rel="noopener noreferrer" className="underline">
          GitHub
        </a>
        , con su historial de cambios.
      </p>
    </article>
  );
};
