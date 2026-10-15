let status = '正在检查离线资源…';
export function offlineStatus() { return status; }
export function installOffline(changed: () => void) {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status = '离线安装需要 HTTPS 或 localhost。请先从安全地址打开并缓存游戏。'; changed(); return;
  }
  const workerUrl = new URL('./sw.js', document.baseURI);
  void navigator.serviceWorker.register(workerUrl).then(async registration => {
    const report = () => {
      status = registration.waiting ? '新版本已缓存；关闭所有游戏页面后重新打开更新。'
        : registration.active ? '离线资源已就绪。可添加到主屏幕，断网后从此地址打开。'
        : '正在缓存全部游戏资源，请暂时保持联网…';
      changed();
    };
    registration.addEventListener('updatefound', () => {
      report(); registration.installing?.addEventListener('statechange', report);
    });
    registration.installing?.addEventListener('statechange', report); report();
    await navigator.serviceWorker.ready; report();
    void navigator.storage?.persist?.();
  }).catch(() => { status = '离线缓存未完成。开发模式不提供缓存，请使用构建后的静态网页。'; changed(); });
}
