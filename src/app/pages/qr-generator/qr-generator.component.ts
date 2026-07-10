import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  QRCodeGeneratorService,
  QrGeneratedImage,
  QrImageFormat
} from '../../services/qr-code-generator.service';

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-generator.component.html',
  styleUrl: './qr-generator.component.scss'
})
export class QrGeneratorComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly qrCodeGenerator = inject(QRCodeGeneratorService);

  readonly inputText = signal('');
  readonly imageFormat = signal<QrImageFormat>('png');
  readonly generating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly generatedImage = signal<QrGeneratedImage | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.clearCurrentImage());
  }

  updateInputText(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.inputText.set(input?.value ?? '');
  }

  updateImageFormat(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const value = select?.value === 'jpg' ? 'jpg' : 'png';
    this.imageFormat.set(value);
  }

  generateQrCode(): void {
    const text = this.inputText().trim();
    if (!text) {
      this.errorMessage.set('Enter text to encode in the QR code.');
      return;
    }

    this.generating.set(true);
    this.errorMessage.set(null);
    this.clearCurrentImage();

    this.qrCodeGenerator
      .generate(text, this.imageFormat())
      .pipe(
        finalize(() => this.generating.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (image) => this.generatedImage.set(image),
        error: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Unable to generate the QR code right now.';
          this.errorMessage.set(message);
        }
      });
  }

  downloadQrCode(): void {
    const image = this.generatedImage();
    if (!image) {
      return;
    }

    this.qrCodeGenerator.download(image);
  }

  private clearCurrentImage(): void {
    const current = this.generatedImage();
    if (current) {
      this.qrCodeGenerator.revokeObjectUrl(current.objectUrl);
    }
    this.generatedImage.set(null);
  }
}
