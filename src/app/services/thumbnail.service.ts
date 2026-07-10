import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ThumbnailApprovalResponse, ThumbnailImage } from '../models/thumbnail.model';

@Injectable({ providedIn: 'root' })
export class ThumbnailService {
  private readonly http = inject(HttpClient);

  getImages(approved = false): Observable<ThumbnailImage[]> {
    return this.http.get<unknown>(`${environment.thumbnailApiBaseUrl}`, { params: { approved } }).pipe(
      map(res => {
        const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
        const arr = candidates.map(k => (res as Record<string, unknown>)[k]).find(v => Array.isArray(v)) ?? res;
        const items = Array.isArray(arr) ? arr : [arr];
        return (items as ThumbnailImage[]).map(item => ({
          ...item,
          ImageLocationTN: this.resolveUrl(item.ImageLocationTN, environment.thumbnailImageBaseUrl),
          ImageLocation: this.resolveUrl(item.ImageLocation, environment.thumbnailFullImageBaseUrl)
        }));
      })
    );
  }

  updateImageApproval(imageId: number, approved: boolean): Observable<ThumbnailApprovalResponse> {
    const params = new HttpParams()
      .set('imageId', imageId)
      .set('approved', approved);

    return this.http.post<ThumbnailApprovalResponse>(environment.thumbnailApprovalApiUrl, null, { params });
  }

  private resolveUrl(path: string, baseUrl: string): string {
    if (!path) {
      return path;
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${baseUrl}${path.replace(/^\/+/, '')}`;
  }
}
