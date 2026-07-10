import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';

export type QrImageFormat = 'png' | 'jpg';

export interface QrGeneratedImage {
  blob: Blob;
  objectUrl: string;
  format: QrImageFormat;
  mimeType: string;
  suggestedFileName: string;
}

@Injectable({ providedIn: 'root' })
export class QRCodeGeneratorService {
  private readonly defaultSizePx = 400;

  /** Converts text into a QR code image blob (PNG or JPG). */
  generate(text: string, format: QrImageFormat = 'png', sizePx = this.defaultSizePx): Observable<QrGeneratedImage> {
    return from(this.generateFromText(text, format, sizePx));
  }

  async generateFromText(
    text: string,
    format: QrImageFormat = 'png',
    sizePx = this.defaultSizePx
  ): Promise<QrGeneratedImage> {
    const payload = text.trim();
    if (!payload) {
      throw new Error('Enter text to encode in the QR code.');
    }

    const size = Math.max(120, Math.min(sizePx, 1000));
    const pngBlob = await this.fetchPngBlob(payload, size);
    const blob = format === 'jpg' ? await this.convertBlobToJpeg(pngBlob) : pngBlob;
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const extension = format === 'jpg' ? 'jpg' : 'png';

    return {
      blob,
      objectUrl: URL.createObjectURL(blob),
      format,
      mimeType,
      suggestedFileName: this.buildFileName(payload, extension)
    };
  }

  /** Triggers a browser download to the user's chosen local folder. */
  download(image: QrGeneratedImage): void {
    const anchor = document.createElement('a');
    anchor.href = image.objectUrl;
    anchor.download = image.suggestedFileName;
    anchor.rel = 'noopener';
    anchor.click();
  }

  revokeObjectUrl(objectUrl: string | null | undefined): void {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }

  private async fetchPngBlob(text: string, size: number): Promise<Blob> {
    const url =
      `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=png&data=${encodeURIComponent(text)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('QR code generation failed. Check your connection and try again.');
    }

    return response.blob();
  }

  private convertBlobToJpeg(pngBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const sourceUrl = URL.createObjectURL(pngBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const context = canvas.getContext('2d');

        if (!context) {
          URL.revokeObjectURL(sourceUrl);
          reject(new Error('Unable to convert QR code to JPEG.'));
          return;
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);

        canvas.toBlob(
          (jpegBlob) => {
            URL.revokeObjectURL(sourceUrl);
            if (jpegBlob) {
              resolve(jpegBlob);
            } else {
              reject(new Error('JPEG conversion failed.'));
            }
          },
          'image/jpeg',
          0.92
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(sourceUrl);
        reject(new Error('Unable to load QR image for JPEG conversion.'));
      };

      img.src = sourceUrl;
    });
  }

  private buildFileName(text: string, extension: string): string {
    const slug =
      text
        .slice(0, 48)
        .replace(/[^\w.-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'qr-code';

    return `qr-${slug}.${extension}`;
  }
}
