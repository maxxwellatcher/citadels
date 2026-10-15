const playableCard = '.hand-card[data-build]:not(:disabled), .hand-income-card[data-action]:not(:disabled)';

type HandGesture = {
  card: HTMLButtonElement;
  tray: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  source: DOMRect;
  ghost?: HTMLButtonElement;
  ready: boolean;
};

/** Add upward drag-to-play while keeping the existing click actions. */
export function installHandDrag(app: HTMLElement): () => void {
  let gesture: HandGesture | null = null;
  let suppressedClick: { pointerId: number; until: number } | null = null;
  let playingCard = false;
  const releaseZone = () => app.querySelector<HTMLElement>('.city-stage');

  const valid = (g: HandGesture) => g.card.isConnected && !g.card.disabled && g.card.matches(playableCard);
  const ready = (g: HandGesture, y: number) => y <= g.startY - 50 || (y <= g.startY - 18 && y < g.tray.getBoundingClientRect().top - 6);

  function clearGesture(returnCard = false) {
    const g = gesture;
    gesture = null;
    if (!g) return;
    g.card.classList.remove('is-hand-drag-source');
    g.tray.classList.remove('is-hand-dragging');
    releaseZone()?.classList.remove('hand-release-zone');
    document.body.classList.remove('hand-dragging');
    if (app.hasPointerCapture?.(g.pointerId)) app.releasePointerCapture(g.pointerId);
    if (!g.ghost) return;
    const ghost = g.ghost;
    if (returnCard && ghost.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const animation = ghost.animate([
        { transform: ghost.style.transform, opacity: 1 },
        { transform: 'translate(0, 0) scale(1)', opacity: .35 },
      ], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      animation.onfinish = () => ghost.remove();
      animation.oncancel = () => ghost.remove();
    } else ghost.remove();
  }

  function startGhost(g: HandGesture) {
    const ghost = g.card.cloneNode(true) as HTMLButtonElement;
    ghost.classList.add('hand-drag-ghost');
    ghost.classList.remove('is-hand-drag-source');
    ghost.removeAttribute('id');
    ghost.removeAttribute('title');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.tabIndex = -1;
    ghost.style.left = `${g.source.left}px`;
    ghost.style.top = `${g.source.top}px`;
    ghost.style.width = `${g.source.width}px`;
    ghost.style.height = `${g.source.height}px`;
    document.body.appendChild(ghost);
    g.ghost = ghost;
    g.card.classList.add('is-hand-drag-source');
    g.tray.classList.add('is-hand-dragging');
    document.body.classList.add('hand-dragging');
    app.setPointerCapture?.(g.pointerId);
  }

  function pointerDown(e: PointerEvent) {
    if (gesture || !e.isPrimary || e.button !== 0 || !(e.target instanceof Element)) return;
    suppressedClick = null;
    const card = e.target.closest<HTMLButtonElement>(playableCard);
    const tray = card?.closest<HTMLElement>('.hand-tray');
    if (!card || !tray || !app.contains(card)) return;
    gesture = { card, tray, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, source: card.getBoundingClientRect(), ready: false };
  }

  function pointerMove(e: PointerEvent) {
    const g = gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    if (!valid(g)) { clearGesture(); return; }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.ghost) {
      // Horizontal swipes remain native hand scrolling on touch screens.
      if ((Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) || dy > 12) {
        suppressedClick = { pointerId: e.pointerId, until: performance.now() + 650 };
        clearGesture();
        return;
      }
      if (dy > -10 || Math.abs(dy) < Math.abs(dx)) return;
      startGhost(g);
    }
    e.preventDefault();
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    g.ready = ready(g, e.clientY);
    g.ghost!.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-7, Math.min(7, dx / 20))}deg) scale(1.05)`;
    g.ghost!.classList.toggle('is-release-ready', g.ready);
    releaseZone()?.classList.toggle('hand-release-zone', g.ready);
  }

  function pointerUp(e: PointerEvent) {
    const g = gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    const dragging = !!g.ghost;
    const play = dragging && valid(g) && ready(g, e.clientY);
    if (dragging) {
      e.preventDefault();
      // Prevent the browser's subsequent click from playing a second card
      // after the existing click handler has rerendered the hand.
      suppressedClick = { pointerId: e.pointerId, until: performance.now() + 650 };
    }
    clearGesture(dragging && !play);
    if (play) {
      playingCard = true;
      try { g.card.click(); } finally { playingCard = false; }
    }
  }

  function cancel(e?: Event) {
    if (e instanceof PointerEvent && gesture && e.pointerId !== gesture.pointerId) return;
    if (gesture?.ghost) suppressedClick = { pointerId: gesture.pointerId, until: performance.now() + 650 };
    clearGesture(true);
  }

  function suppressClick(e: MouseEvent) {
    if (playingCard || !suppressedClick || performance.now() > suppressedClick.until) return;
    if (e instanceof PointerEvent && e.pointerId !== suppressedClick.pointerId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    suppressedClick = null;
  }

  function preventNativeDrag(e: DragEvent) {
    if (e.target instanceof Element && e.target.closest(playableCard)) e.preventDefault();
  }

  app.addEventListener('pointerdown', pointerDown);
  document.addEventListener('pointermove', pointerMove, { passive: false });
  document.addEventListener('pointerup', pointerUp);
  document.addEventListener('pointercancel', cancel);
  app.addEventListener('lostpointercapture', cancel);
  app.addEventListener('dragstart', preventNativeDrag);
  app.addEventListener('click', suppressClick, true);
  window.addEventListener('blur', cancel);
  window.addEventListener('resize', cancel);
  document.addEventListener('visibilitychange', cancel);
  const observer = new MutationObserver(() => { if (gesture && !valid(gesture)) clearGesture(); });
  observer.observe(app, { childList: true, subtree: true });

  return () => {
    clearGesture();
    observer.disconnect();
    app.removeEventListener('pointerdown', pointerDown);
    document.removeEventListener('pointermove', pointerMove);
    document.removeEventListener('pointerup', pointerUp);
    document.removeEventListener('pointercancel', cancel);
    app.removeEventListener('lostpointercapture', cancel);
    app.removeEventListener('dragstart', preventNativeDrag);
    app.removeEventListener('click', suppressClick, true);
    window.removeEventListener('blur', cancel);
    window.removeEventListener('resize', cancel);
    document.removeEventListener('visibilitychange', cancel);
  };
}
