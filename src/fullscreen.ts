import './fullscreen.css';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => void | Promise<void>;
};
type FullscreenRoot = HTMLElement & { webkitRequestFullscreen?: () => void | Promise<void> };
const fullscreenDocument = document as FullscreenDocument;
const fullscreenRoot = document.documentElement as FullscreenRoot;
let transitioning = false;

const active = () => !!(document.fullscreenElement || fullscreenDocument.webkitFullscreenElement);
const available = () => document.fullscreenEnabled === true || fullscreenDocument.webkitFullscreenEnabled === true;
const icon = (exit: boolean) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${exit ? '<path d="M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6"/>' : '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'}</svg>`;

export function fullscreenButton(extraClass = ''): string {
  const exit = active();
  const supported = available() || exit;
  return `<button type="button" class="fullscreen-button ${extraClass}" data-fullscreen aria-label="${supported ? exit ? '退出全屏' : '进入全屏' : '当前浏览器不支持全屏'}" aria-pressed="${exit}" ${!supported || transitioning ? 'disabled' : ''}>${icon(exit)}<span>${exit ? '退出全屏' : '全屏'}</span></button>`;
}

export function installFullscreen(app: HTMLElement): () => void {
  let noticeTimer: number | undefined;
  const sync = () => {
    const exit = active();
    const supported = available() || exit;
    app.querySelectorAll<HTMLButtonElement>('[data-fullscreen]').forEach(button => {
      button.disabled = transitioning || !supported;
      button.setAttribute('aria-label', supported ? exit ? '退出全屏' : '进入全屏' : '当前浏览器不支持全屏');
      button.setAttribute('aria-pressed', String(exit));
      button.innerHTML = `${icon(exit)}<span>${exit ? '退出全屏' : '全屏'}</span>`;
    });
  };
  const showFailure = () => {
    document.querySelector('.fullscreen-notice')?.remove();
    window.clearTimeout(noticeTimer);
    const notice = document.createElement('p');
    notice.className = 'fullscreen-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = '未能切换全屏，请再次点击。';
    document.body.appendChild(notice);
    noticeTimer = window.setTimeout(() => notice.remove(), 3500);
  };
  const toggle = async () => {
    if (transitioning) return;
    transitioning = true;
    sync();
    try {
      if (active()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await fullscreenDocument.webkitExitFullscreen?.();
      } else if (document.fullscreenEnabled && fullscreenRoot.requestFullscreen) {
        await fullscreenRoot.requestFullscreen();
      } else if (fullscreenDocument.webkitFullscreenEnabled && fullscreenRoot.webkitRequestFullscreen) {
        await fullscreenRoot.webkitRequestFullscreen();
      }
    } catch { showFailure(); }
    finally { transitioning = false; sync(); }
  };
  const click = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-fullscreen]') : null;
    if (!target || !app.contains(target) || target.disabled) return;
    // Fullscreen changes the browser display without rebuilding a hand or form.
    event.preventDefault();
    event.stopPropagation();
    void toggle();
  };
  document.addEventListener('click', click, true);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  // A game render replaces its header; synchronize the new button as well.
  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' && record.addedNodes.length && [...record.addedNodes].some(node => node instanceof Element && (node.matches('[data-fullscreen]') || !!node.querySelector('[data-fullscreen]'))))) sync();
  });
  observer.observe(app, { childList: true, subtree: true });
  sync();
  return () => {
    observer.disconnect();
    document.removeEventListener('click', click, true);
    document.removeEventListener('fullscreenchange', sync);
    document.removeEventListener('webkitfullscreenchange', sync);
    window.clearTimeout(noticeTimer);
    document.querySelector('.fullscreen-notice')?.remove();
  };
}
