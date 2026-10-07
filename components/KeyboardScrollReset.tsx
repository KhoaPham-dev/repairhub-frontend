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

function resetWindowScroll() {
  if (isEditable(document.activeElement)) return;
  const offset = window.scrollY || document.documentElement.scrollTop;
  if (offset !== 0) window.scrollTo(0, 0);
}

// The app uses a locked viewport (<main> is the only scroller). iOS scrolls the
// window when the keyboard opens and does not restore it when it closes, so
// reset the window offset (never <main>) once no editable element has focus.
export default function KeyboardScrollReset() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        resetWindowScroll();
      }, 100);
    };

    document.addEventListener('focusout', schedule, true);

    const vv = window.visualViewport;
    let lastHeight = vv?.height ?? 0;
    const onResize = () => {
      if (!vv) return;
      const grew = vv.height > lastHeight;
      lastHeight = vv.height;
      if (grew) schedule();
    };
    vv?.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('focusout', schedule, true);
      vv?.removeEventListener('resize', onResize);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
