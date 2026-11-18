import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronUp, ExternalLink, Mail, MapPin, Wallet, FileSignature, CalendarClock } from 'lucide-react';
import type { JobPosting } from '../../types';
import { jobContact, shortSummary } from '../../utils/jobContact';
import { formatExpiryDate, getJobExpiry } from '../../utils/jobExpiry';

/**
 * Resumen de la oferta en Mis postulaciones: empresa, datos clave, de qué se trata y cómo postular
 * (correo publicado en la oferta o enlace oficial). Se puede plegar para ahorrar espacio.
 */
export const OfferSummary: React.FC<{ job: JobPosting }> = ({ job }) => {
  const [open, setOpen] = useState(true);
  const [full, setFull] = useState(false);
  const contact = jobContact(job);
  const summary = shortSummary(job.description);
  const isLong = (job.description || '').trim().length > summary.length + 20;
  const expiry = getJobExpiry(job);
  const deadline = expiry ? `${formatExpiryDate(expiry.date)}${expiry.estimated ? ' (estimado)' : ''}` : null;

  const facts: Array<{ icon: typeof MapPin; label: string; value?: string | null }> = [
    { icon: MapPin, label: 'Lugar', value: [job.commune || job.location, job.modality].filter(Boolean).join(' · ') },
    { icon: Wallet, label: 'Renta', value: job.salary_range },
    { icon: FileSignature, label: 'Contrato', value: job.contract_type },
    { icon: CalendarClock, label: 'Cierre', value: deadline }
  ].filter((f) => f.value);

  return (
    <section aria-labelledby={`offer-summary-${job.id}`} className="rounded-2xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border shadow-sm text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-4 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none rounded-2xl"
      >
        <span id={`offer-summary-${job.id}`} className="text-sm font-bold text-ink dark:text-white">Resumen de la oferta</span>
        {open ? <ChevronUp className="w-4 h-4 text-ink-muted" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-ink-muted" aria-hidden="true" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 mt-0.5 text-ink-muted shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink dark:text-white">{job.company || 'Empresa no indicada'}</p>
              <p className="text-ink-muted dark:text-ink-200">Publicada en {contact.sourceLabel}</p>
            </div>
          </div>

          {facts.length > 0 && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start gap-1.5">
                  <f.icon className="w-3.5 h-3.5 mt-0.5 text-ink-muted shrink-0" aria-hidden="true" />
                  <dt className="text-ink-muted dark:text-ink-200">{f.label}:</dt>
                  <dd className="font-medium text-ink dark:text-gray-100">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {summary && (
            <div className="space-y-1">
              <p className="formal-justify text-ink dark:text-gray-200 leading-relaxed whitespace-pre-line">
                {full ? job.description.trim() : summary}
              </p>
              {isLong && (
                <button type="button" onClick={() => setFull(!full)} className="underline font-semibold text-brand-700 dark:text-brand-300 cursor-pointer">
                  {full ? 'Ver menos' : 'Ver descripción completa'}
                </button>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 dark:border-ink-border space-y-2">
            <p className="font-semibold text-ink dark:text-white">Contacto y postulación</p>
            {contact.emails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}?subject=${encodeURIComponent(`Postulación: ${job.title}`)}`}
                className="flex items-center gap-1.5 w-fit min-h-[36px] px-3 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-700/60 font-semibold text-brand-800 dark:text-brand-200 hover:bg-brand-100"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" /> {email}
              </a>
            ))}
            {contact.applyUrl && (
              <a
                href={contact.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 w-fit min-h-[36px] px-3 rounded-lg border border-gray-200 dark:border-ink-line font-semibold text-ink dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-ink-raised"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Postular en {contact.sourceLabel === 'Pegada por ti' ? 'el sitio original' : contact.sourceLabel}
              </a>
            )}
            {!contact.emails.length && !contact.applyUrl && (
              <p className="text-ink-muted dark:text-ink-200">La oferta no publica un correo ni un enlace. Revisa la descripción completa por si indica otra forma de postular.</p>
            )}
            {!contact.emails.length && contact.applyUrl && (
              <p className="text-ink-muted dark:text-ink-200">La oferta no publica un correo de contacto: se postula desde el enlace oficial.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
