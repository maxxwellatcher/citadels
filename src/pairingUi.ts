import QRCode from 'qrcode';
import jsQR from 'jsqr';
import type { OnlineClient } from './online';
import './pairing.css';

let panel: HTMLDialogElement | null = null;
let output = '';
let stream: MediaStream | null = null;
let frame = 0;
let wasPairing = false;
function stopCamera() { cancelAnimationFrame(frame); stream?.getTracks().forEach(track => track.stop()); stream = null; }
export function openPairing(client: OnlineClient, name: string) {
  panel?.remove(); stopCamera(); output = ''; wasPairing = false;
  panel = document.createElement('dialog'); panel.className = 'pairing-dialog';
  panel.innerHTML = `<h2>离线配对</h2><p>${client.isHost ? '每次邀请一位玩家：让对方扫描邀请，再扫描对方生成的回复。' : '先连接房主的热点或同一 Wi-Fi，再扫描房主邀请。生成回复后，请房主扫描你的回复。'}</p>
    <p class="pair-status" role="status"></p><canvas class="pair-qr" hidden></canvas>
    <label class="pair-output-label" hidden>配对文本<textarea class="pair-output" readonly rows="3"></textarea></label>
    <button class="secondary pair-copy" hidden>复制配对文本</button>
    <label>导入${client.isHost ? '玩家回复' : '房主邀请'}<textarea class="pair-input" rows="4" maxlength="24000" placeholder="粘贴 CT1. 开头的配对文本，或扫描二维码"></textarea></label>
    <div class="online-controls"><button class="primary pair-submit">${client.isHost ? '完成配对' : '生成回复'}</button><button class="secondary pair-camera">打开相机扫码</button><label class="pair-file">识别二维码图片<input type="file" accept="image/*" capture="environment" /></label></div>
    <video playsinline muted hidden></video><p class="pair-error" role="alert"></p><button class="secondary pair-close">关闭</button>`;
  document.body.append(panel); panel.showModal();
  const current = panel;
  const error = (message: string) => { current.querySelector('.pair-error')!.textContent = message; };
  const submit = async () => {
    const button = current.querySelector<HTMLButtonElement>('.pair-submit')!;
    button.disabled = true; error('');
    try {
      await client.pair(current.querySelector<HTMLTextAreaElement>('.pair-input')!.value, name);
      syncPairing(client);
      if (client.isHost) current.querySelector('.pair-status')!.textContent = '回复已导入，正在建立直连。若两分钟内未连接，请重新生成邀请。';
    } catch (reason) { error(reason instanceof Error ? reason.message : '配对失败'); }
    finally { button.disabled = false; }
  };
  current.querySelector('.pair-submit')!.addEventListener('click', () => void submit());
  function acceptQr(text: string) {
    if (!text.startsWith('CT1.')) { error('这不是游戏配对二维码。'); return; }
    current.querySelector<HTMLTextAreaElement>('.pair-input')!.value = text;
    stopCamera(); current.querySelector('video')!.hidden = true; void submit();
  }
  function readImage(source: CanvasImageSource, width: number, height: number) {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(width, height));
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(pixels.data, pixels.width, pixels.height)?.data;
  }
  current.querySelector<HTMLInputElement>('input[type=file]')!.onchange = async event => {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    try {
      const url = URL.createObjectURL(file); const img = new Image();
      try { img.src = url; await img.decode(); const text = readImage(img, img.naturalWidth, img.naturalHeight); if (text) acceptQr(text); else error('未识别到二维码，请拍摄清晰完整的二维码。'); }
      finally { URL.revokeObjectURL(url); }
    } catch { error('无法读取图片，请尝试粘贴配对文本。'); }
  };
  current.querySelector('.pair-camera')!.addEventListener('click', async () => {
    try {
      stopCamera(); stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!current.open) { stopCamera(); return; }
      const video = current.querySelector('video')!; video.srcObject = stream; video.hidden = false; await video.play();
      let last = 0;
      const scan = (time: number) => {
        if (!stream) return;
        if (video.readyState >= 2 && time - last > 250) {
          last = time; const text = readImage(video, video.videoWidth, video.videoHeight);
          if (text) { acceptQr(text); return; }
        }
        frame = requestAnimationFrame(scan);
      }; frame = requestAnimationFrame(scan);
    } catch { error('无法打开相机，请允许相机权限，或选择二维码图片/粘贴文本。'); }
  });
  current.querySelector('.pair-copy')!.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(output); error('已复制'); }
    catch { current.querySelector<HTMLTextAreaElement>('.pair-output')!.select(); error('请长按配对文本并复制。'); }
  });
  current.querySelector('.pair-close')!.addEventListener('click', () => current.close());
  current.addEventListener('close', stopCamera); current.addEventListener('cancel', stopCamera);
  syncPairing(client);
}
export function syncPairing(client: OnlineClient) {
  if (!panel?.open) return;
  if (wasPairing && !client.pairing && client.status === 'connected') { panel.close(); stopCamera(); return; }
  const pairing = client.pairing;
  if (!pairing || pairing.text === output) return;
  wasPairing = true; output = pairing.text;
  const current = panel;
  current.querySelector('.pair-status')!.textContent = pairing.kind === 'offer' ? '请玩家扫描邀请，然后把玩家的回复导入下方。邀请两分钟内有效。' : '请房主扫描此回复。保持此页打开，等待直连完成。';
  current.querySelector<HTMLTextAreaElement>('.pair-output')!.value = output;
  current.querySelector<HTMLElement>('.pair-output-label')!.hidden = false;
  current.querySelector<HTMLButtonElement>('.pair-copy')!.hidden = false;
  const canvas = current.querySelector<HTMLCanvasElement>('.pair-qr')!;
  void Promise.resolve().then(async () => {
    const qr = QRCode.create(output, { errorCorrectionLevel: 'L' });
    // jsQR 1.4 fails to decode version 23 matrices; use the next size instead.
    const version = qr.version === 23 ? 24 : qr.version;
    const modules = 17 + version * 4;
    await QRCode.toCanvas(canvas, output, { version, width: (modules + 8) * 6, margin: 4, errorCorrectionLevel: 'L' });
    canvas.hidden = false;
  }).catch(() => {
    current.querySelector('.pair-error')!.textContent = '配对信息较长，请复制文本传递，或减少设备上的网络接口后重试。';
  });
}
window.addEventListener('pagehide', stopCamera);
