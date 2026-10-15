type CardOrigin = { x: number; y: number; width: number; height: number };
let opening: { startedAt: number; origins: Map<string, CardOrigin> } | null = null;
let closing: { startedAt: number; from: Map<string, string>; origins: Map<string, CardOrigin>; promise: Promise<void>; resolve: () => void; timer: number } | null = null;
const openingDuration = 580;
const closingDuration = 460;
const openingInterval = 16;
const closingInterval = 12;

function thumbnailOrigins() {
  const origins = new Map<string, CardOrigin>();
  document.querySelectorAll<HTMLElement>('[data-role-thumb]').forEach(thumb => {
    const rect = thumb.getBoundingClientRect();
    origins.set(thumb.dataset.roleThumb!, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height });
  });
  return origins;
}

function animateClosing() {
  if (!closing) return;
  const timeline = closing;
  const elapsed = performance.now() - timeline.startedAt;
  document.querySelector('.role-modal-backdrop')?.classList.add('roles-closing');
  document.querySelector('.role-picker-modal')?.classList.add('roles-arriving');
  document.querySelectorAll<HTMLButtonElement>('[data-role-card]').forEach((card, index) => {
    const id = card.dataset.roleCard!;
    const source = timeline.origins.get(id);
    if (!source) return;
    card.disabled = true;
    card.getAnimations().forEach(animation => animation.cancel());
    const rect = card.getBoundingClientRect();
    const dx = source.x - (rect.left + rect.width / 2);
    const dy = source.y - (rect.top + rect.height / 2);
    const sx = source.width / card.offsetWidth;
    const sy = source.height / card.offsetHeight;
    const destination = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    card.classList.add('is-expanding');
    const animation = card.animate([
      { transform: timeline.from.get(id) ?? 'none', opacity: 1 },
      { transform: destination, opacity: .9, offset: .9 },
      { transform: destination, opacity: 0 },
    ], { duration: closingDuration, delay: index * closingInterval, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
    animation.currentTime = elapsed;
  });
}

/** Keep the overlay until all eight cards have returned to their thumbnails. */
export function closeRolePickerAnimation(): Promise<void> {
  if (closing) return closing.promise;
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-role-card]'));
  if (!cards.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { opening = null; return Promise.resolve(); }
  const from = new Map(cards.map(card => [card.dataset.roleCard!, getComputedStyle(card).transform]));
  let resolveClose!: () => void;
  const promise = new Promise<void>(resolve => { resolveClose = resolve; });
  closing = { startedAt: performance.now(), from, origins: thumbnailOrigins(), promise, resolve: resolveClose, timer: 0 };
  animateClosing();
  closing.timer = window.setTimeout(() => { closing = null; opening = null; resolveClose(); }, closingDuration + (cards.length - 1) * closingInterval);
  return promise;
}

/** Expand each role from its own thumbnail, retaining the visible card face. */
export function animateRolePicker(open: boolean) {
  if (!open) {
    opening = null;
    if (closing) { window.clearTimeout(closing.timer); closing.resolve(); closing = null; }
    return;
  }
  if (closing) { animateClosing(); return; }
  const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-role-card]'));
  if (!cards.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!opening) {
    opening = { startedAt: performance.now(), origins: thumbnailOrigins() };
  }
  const elapsed = performance.now() - opening.startedAt;
  if (elapsed >= openingDuration + (cards.length - 1) * openingInterval) return;
  const timeline = opening;
  document.querySelector('.role-picker-modal')?.classList.add('roles-arriving');
  cards.forEach((card, index) => {
    const source = timeline.origins.get(card.dataset.roleCard!);
    if (!source || elapsed >= openingDuration + index * openingInterval) return;
    const rect = card.getBoundingClientRect();
    const dx = source.x - (rect.left + rect.width / 2);
    const dy = source.y - (rect.top + rect.height / 2);
    const sx = source.width / card.offsetWidth;
    const sy = source.height / card.offsetHeight;
    card.disabled = true;
    card.classList.add('is-expanding');
    const animation = card.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 1 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ], { duration: openingDuration, delay: index * openingInterval, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    animation.currentTime = elapsed;
    animation.onfinish = () => {
      if (!card.isConnected) return;
      animation.cancel(); card.classList.remove('is-expanding');
      card.disabled = !card.classList.contains('selectable');
      if (!document.querySelector('.role-card.is-expanding')) document.querySelector('.role-picker-modal')?.classList.remove('roles-arriving');
    };
  });
}
