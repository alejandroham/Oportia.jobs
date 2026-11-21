import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 1.6.11 (DT-29): foco dentro de un diálogo (WCAG 2.4.3 y 2.1.2).
 * - Al abrir, el foco pasa al diálogo (al elemento con [data-autofocus], o al primero enfocable).
 * - Tab y Mayús+Tab quedan dentro del diálogo.
 * - Al cerrar, el foco vuelve al botón que lo abrió.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const previous = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const first = container.querySelector<HTMLElement>('[data-autofocus]') || focusables()[0];
    if (first) first.focus();
    else {
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (current === firstEl || !container.contains(current))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (current === lastEl || !container.contains(current))) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [ref, active]);
}
