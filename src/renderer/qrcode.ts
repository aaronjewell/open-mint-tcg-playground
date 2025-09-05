import QRCode from 'qrcode';

export async function createQrCode(toEncode: string): Promise<string> {
    return QRCode.toString(toEncode, { type: 'svg', margin: 0 });
}