import { renderDistrictIcon } from './districtIcons';

const hintCardSelector = '.role-card[data-role-hint], .skill-card[data-skill-detail], .orbit-city-building[data-district-detail]';
let nextHintId = 0;

type HintPress = {
  card: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  shown: boolean;
  canceled: boolean;
  skill: boolean;
};

/** Show card details in one layer above the table and its overlays. */
export function installRoleHints(app: HTMLElement): () => void {
  let hoveredCard: HTMLElement | null = null;
  let press: HintPress | null = null;
  let pressTimer: number | undefined;
  let hoverTimer: number | undefined;
  let tooltip: HTMLDivElement | null = null;
  let anchor: HTMLElement | null = null;
  let originalDescription: string | null = null;
  let suppressUntil = 0;
  let suppressPointer = -1;

  const cardAt = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(hintCardSelector) : null;
  const valid = (card: HTMLElement) => card.isConnected && app.contains(card) && card.matches(hintCardSelector);
  const hintText = (card: HTMLElement) => card.dataset.roleHint ?? card.dataset.skillDetail ?? card.dataset.districtDetail ?? '';
  const skillDragging = () => !!app.querySelector('.skill-card.is-targeting');
  const waitsForHover = (card: HTMLElement) => card.matches('.role-card, .orbit-city-building');

  function fillDistrictHint(layer: HTMLDivElement, detail: string) {
    const district = JSON.parse(detail) as { name: string; color: string; icon: string; cost: number; points: number; type: string; owner: string; text: string };
    const color = ['blue', 'red', 'green', 'yellow', 'purple'].includes(district.color) ? district.color : '';
    layer.classList.add('district-card-hint', 'district-card');
    if (color) layer.classList.add(color);
    const textElement = (tag: string, className: string, text: string) => {
      const element = document.createElement(tag);
      element.className = className;
      element.textContent = text;
      return element;
    };
    const icon = textElement('span', 'district-icon', '');
    icon.innerHTML = renderDistrictIcon(district);
    layer.append(
      icon,
      textElement('strong', 'district-hint-name', district.name),
      textElement('small', 'district-hint-type', `${district.owner} · ${district.type}`),
      textElement('div', 'district-hint-stats', `费用 ${district.cost} 🪙　${district.points} 分`),
      textElement('p', 'district-hint-description', district.text),
    );
  }

  function hideHint() {
    tooltip?.remove();
    tooltip = null;
    if (anchor) {
      if (originalDescription === null) anchor.removeAttribute('aria-describedby');
      else anchor.setAttribute('aria-describedby', originalDescription);
    }
    anchor = null;
    originalDescription = null;
  }

  function positionHint(x: number, y: number, above: boolean) {
    if (!tooltip) return;
    const margin = 12;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let top = above ? y - height - 22 : y + 20;
    if (top + height > innerHeight - margin) top = y - height - 20;
    if (top < margin) top = margin;
    const left = Math.max(margin, Math.min(x - width / 2, innerWidth - width - margin));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.min(top, Math.max(margin, innerHeight - height - margin))}px`;
  }

  function showHint(card: HTMLElement, x: number, y: number, above = false) {
    if (!valid(card) || !hintText(card).trim() || skillDragging()) return;
    if (anchor !== card) {
      hideHint();
      tooltip = document.createElement('div');
      tooltip.className = `role-card-hint${card.matches('.skill-card') ? ' skill-card-hint' : ''}`;
      tooltip.id = `role-card-hint-${++nextHintId}`;
      tooltip.setAttribute('role', 'tooltip');
      if (card.dataset.districtDetail) fillDistrictHint(tooltip, card.dataset.districtDetail);
      else tooltip.textContent = hintText(card);
      document.body.appendChild(tooltip);
      anchor = card;
      originalDescription = card.getAttribute('aria-describedby');
      card.setAttribute('aria-describedby', `${originalDescription ?? ''} ${tooltip.id}`.trim());
    }
    positionHint(x, y, above);
  }

  function clearTimer() {
    window.clearTimeout(pressTimer);
    pressTimer = undefined;
  }

  function clearHoverTimer() {
    window.clearTimeout(hoverTimer);
    hoverTimer = undefined;
  }

  function waitForMouseHint(card: HTMLElement, x: number, y: number) {
    clearHoverTimer();
    hoverTimer = window.setTimeout(() => {
      hoverTimer = undefined;
      if (hoveredCard === card && !press && valid(card)) showHint(card, x, y, card.matches('.orbit-city-building'));
    }, 1000);
  }

  function cancelPress() {
    clearTimer();
    press = null;
    hideHint();
  }

  function close() {
    clearHoverTimer();
    hoveredCard = null;
    cancelPress();
  }

  function pointerOver(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || e.buttons !== 0 || press || skillDragging()) return;
    const card = cardAt(e.target);
    if (!card || !app.contains(card)) return;
    if (hoveredCard === card) return;
    clearHoverTimer();
    hoveredCard = card;
    if (waitsForHover(card)) {
      hideHint();
      waitForMouseHint(card, e.clientX, e.clientY);
    } else showHint(card, e.clientX, e.clientY);
  }

  function pointerOut(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return;
    const card = cardAt(e.target);
    if (!card || card !== hoveredCard || (e.relatedTarget instanceof Node && card.contains(e.relatedTarget))) return;
    clearHoverTimer();
    hoveredCard = null;
    hideHint();
  }

  function pointerDown(e: PointerEvent) {
    if (!e.isPrimary) { close(); return; }
    suppressUntil = 0;
    const card = cardAt(e.target);
    if (!card || !app.contains(card)) { close(); return; }
    close();
    const mouseSkill = e.pointerType === 'mouse' && e.button === 0 && card.matches('.skill-card');
    if (!mouseSkill && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    const holding: HintPress = { card, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, shown: false, canceled: false, skill: card.matches('.skill-card') };
    press = holding;
    // Pointer capture sends another pointerover to the pressed skill. Keep
    // the mouse press until release so that it cannot reopen the description.
    if (mouseSkill) return;
    pressTimer = window.setTimeout(() => {
      if (press !== holding || holding.canceled || !valid(holding.card)) return;
      holding.shown = true;
      showHint(holding.card, holding.startX, holding.startY, true);
    }, 2000);
  }

  function pointerMove(e: PointerEvent) {
    if (press && e.pointerId === press.pointerId) {
      if (Math.hypot(e.clientX - press.startX, e.clientY - press.startY) > (press.skill ? 7 : 10)) {
        press.canceled = true;
        clearTimer();
        hideHint();
      }
    } else if (e.pointerType === 'mouse' && hoveredCard) {
      if (waitsForHover(hoveredCard)) {
        hideHint();
        waitForMouseHint(hoveredCard, e.clientX, e.clientY);
      } else if (anchor === hoveredCard) positionHint(e.clientX, e.clientY, false);
    }
  }

  function pointerUp(e: PointerEvent) {
    if (!press || e.pointerId !== press.pointerId) return;
    // A skill drag owns its release. Canceling a moved long-press must leave
    // the existing pointerup handler free to apply the skill to its target.
    if (press.skill ? press.shown && !press.canceled : press.shown || press.canceled) {
      e.preventDefault();
      suppressUntil = performance.now() + 650;
      suppressPointer = e.pointerId;
    }
    cancelPress();
  }

  function pointerCancel(e: PointerEvent) {
    if (press && e.pointerId === press.pointerId) cancelPress();
  }

  function click(e: MouseEvent) {
    if (performance.now() > suppressUntil) return;
    if (e instanceof PointerEvent && e.pointerId !== suppressPointer) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    suppressUntil = 0;
  }

  function contextMenu(e: MouseEvent) {
    if (press && cardAt(e.target) === press.card) e.preventDefault();
  }

  function focusIn(e: FocusEvent) {
    const card = cardAt(e.target);
    if (!card || press || !card.matches(':focus-visible')) return;
    const rect = card.getBoundingClientRect();
    showHint(card, rect.left + rect.width / 2, rect.bottom);
  }

  function focusOut(e: FocusEvent) {
    if (cardAt(e.target) === anchor && !press) hideHint();
  }

  function keyDown(e: KeyboardEvent) { if (e.key === 'Escape') close(); }

  // Capture listeners also read hints on disabled cards/passive skills.
  app.addEventListener('pointerover', pointerOver, true);
  app.addEventListener('pointerout', pointerOut, true);
  app.addEventListener('pointerdown', pointerDown, true);
  app.addEventListener('click', click, true);
  app.addEventListener('contextmenu', contextMenu, true);
  app.addEventListener('focusin', focusIn);
  app.addEventListener('focusout', focusOut);
  document.addEventListener('pointermove', pointerMove);
  document.addEventListener('pointerup', pointerUp, { capture: true, passive: false });
  document.addEventListener('pointercancel', pointerCancel, true);
  document.addEventListener('keydown', keyDown);
  document.addEventListener('scroll', close, true);
  document.addEventListener('visibilitychange', close);
  window.addEventListener('resize', close);
  window.addEventListener('blur', close);
  const observer = new MutationObserver(() => {
    if ((anchor && !valid(anchor)) || (press && !valid(press.card)) || (hoveredCard && !valid(hoveredCard))) close();
  });
  observer.observe(app, { childList: true, subtree: true });

  return () => {
    close();
    observer.disconnect();
    app.removeEventListener('pointerover', pointerOver, true);
    app.removeEventListener('pointerout', pointerOut, true);
    app.removeEventListener('pointerdown', pointerDown, true);
    app.removeEventListener('click', click, true);
    app.removeEventListener('contextmenu', contextMenu, true);
    app.removeEventListener('focusin', focusIn);
    app.removeEventListener('focusout', focusOut);
    document.removeEventListener('pointermove', pointerMove);
    document.removeEventListener('pointerup', pointerUp, true);
    document.removeEventListener('pointercancel', pointerCancel, true);
    document.removeEventListener('keydown', keyDown);
    document.removeEventListener('scroll', close, true);
    document.removeEventListener('visibilitychange', close);
    window.removeEventListener('resize', close);
    window.removeEventListener('blur', close);
  };
}
