import * as QRCode from './core/qr-code';
import * as CanvasRenderer from './renderer/canvas';
import { QrCodeOptions } from './renderer/utils';

export * from './core';

// export function renderCanvas(renderFunc: (d: QRCode.RawQrCodeData, c: HTMLCanvasElement, o: Partial<QrCodeOptions>) => Promise<unknown>, canvas: HTMLCanvasElement, text: string, opts: Partial<QrCodeOptions>) {
function renderCanvas(renderFunc: (d: QRCode.RawQrCodeData, c: HTMLCanvasElement, o: QrCodeOptions) => void, canvas: HTMLCanvasElement, text: string, opts: QrCodeOptions) {
    return new Promise((resolve, reject) => {
        try {
            const data = QRCode.create(text, opts);
            resolve(renderFunc(data, canvas, opts));
        } catch (e) {
            reject(e);
        }
    });

}
export const toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
// export const toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);