'use client';

import { useEffect } from 'react';

const NON_TEXT_INPUT_TYPES = new Set([
  'button', 'checkbox', 'radio', 'file', 'submit', 'reset', 'image', 'range', 'color',
]);

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !NON_TEXT_INPUT_TYPES.has((el as HTMLInputElement).type);
  const ce = (el as HTMLElement).getAttribute?.('contenteditable');
  return ce !== null && ce !== undefined && ce !== 'false';
}

function resetWindowScroll(force: boolean) {
  if (!force && isEditable(document.activeElement)) return;
  const offset = window.scrollY || document.documentElement.scrollTop;
  if (offset !== 0) window.scrollTo(0, 0);
}

// The app uses a locked viewport (<main> is the only scroller). iOS scrolls the
// window when the keyboard opens and does not restore it when it closes, so
// reset the window offset (never <main>) once no editable element has focus.
export default function KeyboardScrollReset() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingForce = false;
    const schedule = (force = false) => {
      if (timer) clearTimeout(timer);
      pendingForce = pendingForce || force;
      timer = setTimeout(() => {
        timer = undefined;
        const f = pendingForce;
        pendingForce = false;
        resetWindowScroll(f);
      }, 100);
    };
    const onFocusOut = () => schedule();

    document.addEventListener('focusout', onFocusOut, true);

    const vv = window.visualViewport;
    let lastHeight = vv?.height ?? 0;
    const onResize = () => {
      if (!vv) return;
      const grew = vv.height > lastHeight;
      lastHeight = vv.height;
      // Confirmed keyboard close: viewport is back to full height (1px
      // tolerance for iOS rounding). Reset even if a field still has focus.
      // Partial growth (e.g. QuickType bar) keeps the focus guard.
      if (grew) schedule(vv.height >= window.innerHeight - 1);
    };
    vv?.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('focusout', onFocusOut, true);
      vv?.removeEventListener('resize', onResize);
      if (timer) clearTimeout(timer);
      pendingForce = false;
    };
  }, []);

  return null;
}
