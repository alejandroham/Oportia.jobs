import React, { useEffect, useState } from 'react';
import { Heart, Star, ExternalLink, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog } from '../ui/Dialog';
import { OpiAvatar } from '../ui/OpiAvatar';
import { api, getHumanErrorMessage } from '../../api';
import { useFeedbackStore } from '../../state/useFeedbackStore';
import { markFeedbackDone } from '../../utils/feedbackPrompt';

export const SPONSOR_URL = 'https://github.com/sponsors/alejandroham';
const RATING_LABELS = ['', 'No me sirvió', 'Poco útil', 'Útil', 'Muy útil', '¡Me encanta!'];
import { isValidEmail, isValidPhone, MAX_LENGTH } from '../../utils/validation';

const inputCls =
  'w-full p-2.5 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-sm text-gray-900 dark:text-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none';

/**
 * "¿Qué te parece Oportia?": calificación, comentarios y contacto VOLUNTARIO.
 * El correo o teléfono solo se envían si la persona marca la autorización.
 * Incluye el enlace para apoyar el proyecto con una donación.
 */
export const FeedbackDialog: React.FC = () => {
  const { isOpen, trigger, moment, initialRating, close } = useFeedbackStore();
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState('');
  const [improve, setImprove] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(''); // campo trampa para bots (invisible)
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentId, setSentId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSentId('');
      if (initialRating) setRating(initialRating);
    }
  }, [isOpen, initialRating]);

  const hasContact = Boolean(email.trim() || phone.trim());
  const emailOk = isValidEmail(email);
  const phoneOk = isValidPhone(phone);
  const canSend = rating > 0 && emailOk && phoneOk && (!hasContact || consent) && !sending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      const res = await api.sendOpinion({
        rating,
        liked: liked.trim() || undefined,
        improve: improve.trim() || undefined,
        contact_email: consent ? email.trim() || undefined : undefined,
        contact_phone: consent ? phone.trim() || undefined : undefined,
        contact_consent: consent && hasContact,
        website: website || undefined,
        trigger,
        moment
      });
      markFeedbackDone();
      setSentId(res.id);
      setRating(0);
      setLiked('');
      setImprove('');
      setEmail('');
      setPhone('');
      setConsent(false);
    } catch (err) {
      setError(getHumanErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const donation = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/30">
      <p className="text-xs text-rose-900 dark:text-rose-100">
        <span className="font-semibold">Oportia es gratis y de código abierto.</span> Si te sirve, puedes apoyar su desarrollo con una donación.
      </p>
      <a
        href={SPONSOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 shrink-0 min-h-[40px] px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
      >
        <Heart className="w-3.5 h-3.5 fill-white" aria-hidden="true" /> Apoyar a Oportia
        <ExternalLink className="w-3 h-3 opacity-80" aria-hidden="true" />
      </a>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      title="¿Qué te parece Oportia?"
      description={trigger === 'auto' ? 'Llevas un rato usando Oportia. Tu opinión nos ayuda a mejorarla (toma 1 minuto).' : 'Tu opinión nos ayuda a mejorar Oportia (toma 1 minuto).'}
      maxWidth="lg"
    >
      {sentId ? (
        <div className="space-y-4 text-center">
          <OpiAvatar expression="celebrando" size={96} className="mx-auto" decorative />
          <p className="text-sm font-semibold text-ink dark:text-white">¡Gracias! Recibimos tu opinión.</p>
          <p className="text-xs text-ink-muted dark:text-ink-200">
            Si dejaste tu contacto y quieres que lo borremos, escríbenos por{' '}
            <a href="https://www.instagram.com/not.kano/" target="_blank" rel="noopener noreferrer" className="underline">Instagram</a> con este código:{' '}
            <code className="font-mono">{sentId.slice(0, 8)}</code>
          </p>
          {donation}
          <button type="button" onClick={close} className="min-h-[44px] px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold cursor-pointer">
            Volver a Oportia
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 text-sm">
          <fieldset className="space-y-2">
            <legend className="font-semibold text-ink dark:text-white">¿Qué tan útil te parece? *</legend>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificación de 1 a 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} de 5: ${RATING_LABELS[n]}`}
                  onClick={() => setRating(n)}
                  className="p-1.5 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                >
                  <Star className={`w-7 h-7 ${n <= rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300 dark:text-ink-line'}`} aria-hidden="true" />
                </button>
              ))}
              {rating > 0 && <span className="ml-2 text-xs font-semibold text-ink-muted dark:text-ink-200">{RATING_LABELS[rating]}</span>}
            </div>
          </fieldset>

          <label className="block space-y-1">
            <span className="font-semibold text-ink dark:text-white">¿Qué es lo que más te sirvió?</span>
            <textarea className={inputCls} rows={2} maxLength={1000} value={liked} onChange={(e) => setLiked(e.target.value)} placeholder="Ej. el índice de ofertas, el CV adaptado, Opi…" />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-ink dark:text-white">¿Qué mejorarías?</span>
            <textarea className={inputCls} rows={2} maxLength={1000} value={improve} onChange={(e) => setImprove(e.target.value)} placeholder="Cuéntanos qué te faltó o qué te costó" />
          </label>

          <fieldset className="space-y-2 p-3.5 rounded-2xl border border-gray-200 dark:border-ink-border">
            <legend className="px-1 font-semibold text-ink dark:text-white">¿Podemos contactarte? (opcional)</legend>
            <p className="text-xs text-ink-muted dark:text-ink-200">
              Si quieres, déjanos tu correo o teléfono para conversar sobre mejoras o invitarte a una entrevista. No es obligatorio.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Correo</span>
                <input type="email" autoComplete="email" maxLength={MAX_LENGTH.email} className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.cl" aria-invalid={!emailOk} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Teléfono</span>
                <input type="tel" autoComplete="tel" maxLength={MAX_LENGTH.phone} className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" aria-invalid={!phoneOk} />
              </label>
            </div>
            {(!emailOk || !phoneOk) && <p className="text-xs text-rose-700 dark:text-rose-300">Revisa el {!emailOk ? 'correo' : 'teléfono'}.</p>}
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-brand-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                <span className="font-semibold">Autorizo a Oportia a usar mi correo o teléfono</span> solo para contactarme sobre mejoras de la app o para
                invitarme a una entrevista. No se usarán para publicidad ni se compartirán con terceros, y puedo pedir que los borren cuando quiera.{' '}
                <Link to="/privacidad#9-opiniones-y-contacto-voluntario" onClick={close} className="underline">
                  Política de privacidad
                </Link>
              </span>
            </label>
            {hasContact && !consent && (
              <p className="text-xs text-amber-800 dark:text-amber-200">Para enviar tu contacto marca la autorización, o borra el correo y el teléfono.</p>
            )}
          </fieldset>

          {/* Campo trampa: las personas no lo ven; los bots que lo llenan no se guardan. */}
          <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
            <label>
              Sitio web
              <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          {donation}

          {error && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={close} className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-ink-muted hover:text-ink dark:hover:text-white cursor-pointer">
              Ahora no
            </button>
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" aria-hidden="true" /> {sending ? 'Enviando…' : 'Enviar opinión'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
};
