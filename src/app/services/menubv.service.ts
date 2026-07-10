import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { CrudAction, MenuItem, MenuItemPayload } from '../models/menu-item.model';
import { environment } from '../../environments/environment';
import { MOCK_MENU_ITEMS } from '../mocks/mock-menu-items';

const MENU_READ_URL = environment.menuReadBvApiUrl;
const MENU_CRUD_URL = environment.menuCrudApiUrl;

@Injectable({ providedIn: 'root' })
export class MenuBVService {
  private readonly http = inject(HttpClient);
  private mockMenuItems = [...MOCK_MENU_ITEMS];

  getMenuItems(): Observable<MenuItem[]> {
    if (environment.useMockMenuApi) {
      return of(this.cloneMenuItems(this.mockMenuItems));
    }

    return this.http.get<MenuItem[] | Record<string, unknown>>(MENU_READ_URL).pipe(
      map(response => {
        const normalized = this.normalizeApiPayload(response);
        return normalized.length ? normalized : this.cloneMenuItems(this.mockMenuItems);
      }),
      catchError(err => {
        console.warn('Menu API call failed, using mock data fallback.', err);
        return of(this.cloneMenuItems(this.mockMenuItems));
      })
    );
  }

  mutateMenuItem(action: CrudAction, payload: MenuItemPayload): Observable<MenuItem | MenuItem[]> {
    const params = new HttpParams().set('action', action);
    return this.http.post<MenuItem | MenuItem[]>(MENU_CRUD_URL, payload, { params });
  }

  updateMenuItem(payload: MenuItemPayload): Observable<MenuItem | MenuItem[]> {
    if (!payload.ItemID) {
      throw new Error('ItemID is required to perform an update.');
    }

    if (environment.useMockMenuApi) {
      this.mockMenuItems = this.mockMenuItems.map(item =>
        item.ItemID === payload.ItemID ? { ...item, ...payload } : item
      );

      return of(this.cloneMenuItems(this.mockMenuItems));
    }

    return this.mutateMenuItem('u', payload);
  }

  private cloneMenuItems(items: MenuItem[]): MenuItem[] {
    return items.map(item => ({ ...item }));
  }

  private normalizeApiPayload(response: MenuItem[] | Record<string, unknown>): MenuItem[] {
    if (Array.isArray(response)) {
      return response;
    }

    const candidateKeys = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    for (const key of candidateKeys) {
      const value = response[key];
      if (Array.isArray(value)) {
        return value as MenuItem[];
      }
    }

    return [];
  }
}
