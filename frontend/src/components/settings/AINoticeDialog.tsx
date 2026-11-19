import React from 'react';
import { Download } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { AI_NOTICE_SECTIONS, AI_NOTICE_TITLE, AI_NOTICE_VERSION, DRAFT_NOTE, downloadNotice, type ConsentRecord } from '../../legal/aiNotice';

/** Documento completo del aviso de IA gratuita y exclusión de responsabilidad, con descarga. */
export const AINoticeDialog: React.FC<{ isOpen: boolean; onClose: () => void; record?: ConsentRecord | null }> = ({ isOpen, onClose, record }) => (
  <Dialog isOpen={isOpen} onClose={onClose} title={AI_NOTICE_TITLE} description={`Versión ${AI_NOTICE_VERSION} · ${DRAFT_NOTE}`} maxWidth="2xl">
    <div className="space-y-4 text-xs text-ink dark:text-gray-200">
      <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-3">
        {AI_NOTICE_SECTIONS.map((s) => (
          <section key={s.title} className="space-y-1.5">
            <h3 className="text-sm font-bold text-ink dark:text-white">{s.title}</h3>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="formal-justify leading-relaxed">{p}</p>
            ))}
          </section>
        ))}
        <p className="text-ink-muted dark:text-ink-200">
          Términos de la API de Gemini:{' '}
          <a href="https://aistudio.google.com/docs/terms" target="_blank" rel="noreferrer" className="underline">aistudio.google.com/docs/terms</a>
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100 dark:border-ink-border">
        <button
          type="button"
          onClick={() => downloadNotice(record)}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-gray-300 dark:border-ink-line font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-ink-raised"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" /> {record ? 'Descargar mi comprobante' : 'Descargar este documento'}
        </button>
        <button type="button" onClick={onClose} className="min-h-[40px] px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold cursor-pointer">
          Cerrar
        </button>
      </div>
    </div>
  </Dialog>
);
