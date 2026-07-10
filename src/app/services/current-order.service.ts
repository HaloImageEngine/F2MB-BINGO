import { Injectable, signal } from '@angular/core';

import { OrderFullDetailResponse } from '../models/order-list-item.model';

@Injectable({ providedIn: 'root' })
export class CurrentOrderService {
  private readonly orderIdStorageKey = 'gogi.currentOrderId';
  private readonly orderDetailStorageKey = 'gogi.currentOrderDetail';

  readonly currentOrderId = signal<number | null>(this.readStoredOrderId());
  readonly currentOrderDetail = signal<OrderFullDetailResponse | null>(this.readStoredOrderDetail());

  setCurrentOrderId(orderId: number | null): void {
    this.currentOrderId.set(orderId);

    if (orderId === null) {
      this.removeStoredOrderId();
      return;
    }

    this.writeStoredOrderId(orderId);
  }

  setCurrentOrderDetail(detail: OrderFullDetailResponse | null): void {
    if (!this.isValidOrderDetail(detail)) {
      this.currentOrderDetail.set(null);
      this.removeStoredOrderDetail();
      return;
    }

    this.currentOrderDetail.set(detail);
    this.currentOrderId.set(detail.Head.OrderID);
    this.writeStoredOrderId(detail.Head.OrderID);
    this.writeStoredOrderDetail(detail);
  }

  /** Clears persisted order selection (e.g. on logoff). */
  clearSession(): void {
    this.currentOrderId.set(null);
    this.currentOrderDetail.set(null);
    this.removeStoredOrderId();
    this.removeStoredOrderDetail();
  }

  getStoredOrderDetailFor(orderId: number | null): OrderFullDetailResponse | null {
    if (orderId === null) {
      return null;
    }

    const detail = this.readStoredOrderDetail();
    if (!this.isValidOrderDetail(detail)) {
      return null;
    }

    return detail.Head.OrderID === orderId ? detail : null;
  }

  private readStoredOrderId(): number | null {
    try {
      const raw = localStorage.getItem(this.orderIdStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private readStoredOrderDetail(): OrderFullDetailResponse | null {
    try {
      const raw = localStorage.getItem(this.orderDetailStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as OrderFullDetailResponse;
      if (!this.isValidOrderDetail(parsed)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private writeStoredOrderId(orderId: number): void {
    try {
      localStorage.setItem(this.orderIdStorageKey, String(orderId));
    } catch {
      // Ignore storage write failures.
    }
  }

  private writeStoredOrderDetail(detail: OrderFullDetailResponse): void {
    try {
      localStorage.setItem(this.orderDetailStorageKey, JSON.stringify(detail));
    } catch {
      // Ignore storage write failures.
    }
  }

  private removeStoredOrderId(): void {
    try {
      localStorage.removeItem(this.orderIdStorageKey);
    } catch {
      // Ignore storage remove failures.
    }
  }

  private removeStoredOrderDetail(): void {
    try {
      localStorage.removeItem(this.orderDetailStorageKey);
    } catch {
      // Ignore storage remove failures.
    }
  }

  private isValidOrderDetail(detail: OrderFullDetailResponse | null): detail is OrderFullDetailResponse {
    return !!detail?.Head && Number.isFinite(Number(detail.Head.OrderID));
  }
}