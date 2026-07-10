import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { ThumbnailApprovalResponse, ThumbnailImage } from '../../models/thumbnail.model';
import { ThumbnailService } from '../../services/thumbnail.service';

@Component({
  selector: 'app-thumbnails',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thumbnails.component.html',
  styleUrl: './thumbnails.component.scss'
})
export class ThumbnailsComponent implements OnInit {
  private readonly thumbnailService = inject(ThumbnailService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly images = signal<ThumbnailImage[]>([]);
  readonly rowError = signal<string | null>(null);
  readonly rowSuccess = signal<ThumbnailApprovalResponse | null>(null);
  readonly approvingImageIds = signal<number[]>([]);

  readonly totalCount = computed(() => this.images().length);
  readonly approvedCount = computed(() => this.images().filter(i => i.Approved).length);

  readonly trackById = (_index: number, img: ThumbnailImage) => img.ImageId;

  ngOnInit(): void {
    this.loadImages();
  }

  loadImages(): void {
    this.loading.set(true);
    this.error.set(null);

    this.thumbnailService
      .getImages()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          this.error.set('Unable to load images. Please try again.');
          console.error('Thumbnail load failed', err);
          return of<ThumbnailImage[]>([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(items => this.images.set(items));
  }

  approveImage(image: ThumbnailImage, event: Event): void {
    event.stopPropagation();

    if (image.Approved || this.isApproving(image.ImageId)) {
      return;
    }

    this.rowError.set(null);
    this.rowSuccess.set(null);
    this.approvingImageIds.update(ids => [...ids, image.ImageId]);

    this.thumbnailService
      .updateImageApproval(image.ImageId, true)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          this.rowError.set('Unable to approve image. Please try again.');
          console.error('Image approval failed', err);
          return of<ThumbnailApprovalResponse | null>(null);
        }),
        finalize(() => {
          this.approvingImageIds.update(ids => ids.filter(id => id !== image.ImageId));
        })
      )
      .subscribe(response => {
        if (!response) {
          return;
        }

        this.rowSuccess.set(response);
        this.images.update(items =>
          items.map(item => (item.ImageId === response.imageId ? { ...item, Approved: response.approved } : item))
        );
      });
  }

  isApproving(imageId: number): boolean {
    return this.approvingImageIds().includes(imageId);
  }

  navigateToDetail(image: ThumbnailImage): void {
    this.router.navigate(['/thumbnail-detail', image.ImageId], { state: { image } });
  }
}
