import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ThumbnailImage } from '../../models/thumbnail.model';

@Component({
  selector: 'app-thumbnail-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thumbnail-detail.component.html',
  styleUrl: './thumbnail-detail.component.scss'
})
export class ThumbnailDetailComponent implements OnInit {
  private readonly router = inject(Router);

  readonly image = signal<ThumbnailImage | null>(null);
  readonly imgLoading = signal(true);
  readonly imgError = signal(false);

  ngOnInit(): void {
    const state = history.state as { image?: ThumbnailImage };
    if (state?.image) {
      this.image.set(state.image);
    } else {
      this.router.navigate(['/thumbnails']);
    }
  }

  goBack(): void {
    this.router.navigate(['/thumbnails']);
  }

  onImageLoad(): void {
    this.imgLoading.set(false);
  }

  onImageError(): void {
    this.imgLoading.set(false);
    this.imgError.set(true);
  }
}
