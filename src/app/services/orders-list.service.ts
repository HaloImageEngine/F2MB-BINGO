import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { OrderFullDetailResponse, OrderListItem, OrderStatus } from '../models/order-list-item.model';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class OrdersListService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly ordersByStatusUrl = environment.ordersByStatusApiUrl;
  private readonly orderByIdFullUrl = environment.orderByIdFullApiUrl;
  private readonly updateOrderStatusUrl = environment.ordersStatusChangeApiUrl;

  getOrdersByStatus(status: OrderStatus): Observable<OrderListItem[]> {
    const params = new HttpParams().set('status', status.toUpperCase());
    return this.http.get<OrderListItem[]>(this.ordersByStatusUrl, { params });
  }

  getOrderByIdFull(orderId: number): Observable<OrderFullDetailResponse | null> {
    const params = new HttpParams().set('OrderId', orderId);
    this.logger.log('🌐', '[API] Fetching OrderID:', orderId);
    return this.http.get<unknown>(this.orderByIdFullUrl, { params }).pipe(
      map(response => {
        this.logger.log('🌐', '[API RAW RESPONSE]', response);
        const normalized = this.normalizeOrderDetailResponse(response, orderId);
        this.logger.log('🌐', '[API NORMALIZED]', normalized);
        return normalized;
      })
    );
  }

  updateOrderStatus(orderId: number, status: Extract<OrderStatus, 'complete' | 'preparing' | 'ready'>): Observable<unknown> {
    const payload = {
      OrderID: orderId,
      StatusCode: this.toApiStatusCode(status)
    };

    return this.http.post<unknown>(this.updateOrderStatusUrl, payload);
  }

  private toApiStatusCode(status: Extract<OrderStatus, 'complete' | 'preparing' | 'ready'>): string {
    return `${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()}`;
  }

  private normalizeOrderDetailResponse(response: unknown, fallbackOrderId: number): OrderFullDetailResponse | null {
    this.logger.log('🌐', '[NORMALIZE START]', { response, fallbackOrderId });

    const payload = this.unwrapPayload(response);
    this.logger.log('🌐', '[NORMALIZE UNWRAPPED]', payload);

    const source = Array.isArray(payload) ? payload[0] : payload;
    this.logger.log('🌐', '[NORMALIZE SOURCE]', source);

    if (!source || typeof source !== 'object') {
      this.logger.log('🌐', '[NORMALIZE] ❌ Source is not an object, returning null');
      return null;
    }

    const record = source as Record<string, unknown>;
    const headSource = this.pickObject(record, ['Head', 'head', 'OrderHead', 'orderHead']) ?? record;
    this.logger.log('🌐', '[NORMALIZE HEAD SOURCE]', headSource);

    const details = this.pickArray(record, ['OrderDetailsList', 'orderDetailsList', 'Details', 'details']);
    this.logger.log('🌐', '[NORMALIZE DETAILS ARRAY]', details);

    const normalizedHead = this.normalizeHead(headSource, fallbackOrderId);
    this.logger.log('🌐', '[NORMALIZE HEAD RESULT]', normalizedHead);

    const headOrderId = Number(normalizedHead.OrderID);
    this.logger.log('🌐', '[NORMALIZE HEAD ORDER ID]', { headOrderId, isFinite: Number.isFinite(headOrderId) });

    if (!Number.isFinite(headOrderId)) {
      this.logger.log('🌐', '[NORMALIZE] ❌ Invalid OrderID, returning null');
      return null;
    }

    this.logger.log('🌐', '[NORMALIZE] ✅ Success');
    return {
      Head: normalizedHead,
      OrderDetailsList: details.map(item => this.normalizeLineItem(item))
    };
  }

  private unwrapPayload(response: unknown): unknown {
    const top = Array.isArray(response) ? response[0] : response;
    if (!top || typeof top !== 'object') {
      return response;
    }

    const record = top as Record<string, unknown>;
    const candidates = ['data', 'Data', 'result', 'Result', 'payload', 'Payload'];
    for (const key of candidates) {
      const value = record[key];
      if (value !== undefined && value !== null) {
        return value;
      }
    }

    return top;
  }

  private pickObject(source: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
    for (const key of keys) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }

    return null;
  }

  private pickArray(source: Record<string, unknown>, keys: string[]): unknown[] {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }

  private normalizeHead(headSource: Record<string, unknown>, fallbackOrderId: number): OrderFullDetailResponse['Head'] {
    return {
      OrderID: this.pickNumber(headSource, ['OrderID', 'OrderId', 'orderId', 'orderID']) ?? fallbackOrderId,
      OrderNumber: this.pickString(headSource, ['OrderNumber', 'orderNumber']) ?? '',
      StatusCode: this.pickString(headSource, ['StatusCode', 'statusCode']) ?? '',
      StatusName: this.pickNullableString(headSource, ['StatusName', 'statusName']),
      CustomerName: this.pickString(headSource, ['CustomerName', 'customerName']) ?? '',
      CustomerPhone: this.pickString(headSource, ['CustomerPhone', 'customerPhone']) ?? '',
      CustomerEmail: this.pickString(headSource, ['CustomerEmail', 'customerEmail']) ?? '',
      OrderType: this.pickString(headSource, ['OrderType', 'orderType']) ?? '',
      OrderNotes: this.pickString(headSource, ['OrderNotes', 'orderNotes']) ?? '',
      SubTotal: this.pickNumber(headSource, ['SubTotal', 'subTotal']) ?? 0,
      TaxAmount: this.pickNumber(headSource, ['TaxAmount', 'taxAmount']) ?? 0,
      DiscountAmount: this.pickNumber(headSource, ['DiscountAmount', 'discountAmount']) ?? 0,
      TotalAmount: this.pickNumber(headSource, ['TotalAmount', 'totalAmount']) ?? 0,
      ItemCount: this.pickNumber(headSource, ['ItemCount', 'itemCount']) ?? 0,
      RequestedReadyTime: this.pickNullableString(headSource, ['RequestedReadyTime', 'requestedReadyTime']),
      ConfirmedAt: this.pickNullableString(headSource, ['ConfirmedAt', 'confirmedAt']),
      CompletedAt: this.pickNullableString(headSource, ['CompletedAt', 'completedAt']),
      CancelledAt: this.pickNullableString(headSource, ['CancelledAt', 'cancelledAt']),
      CreatedAt: this.pickString(headSource, ['CreatedAt', 'createdAt']) ?? '',
      UpdatedAt: this.pickString(headSource, ['UpdatedAt', 'updatedAt']) ?? ''
    };
  }

  private normalizeLineItem(item: unknown): OrderFullDetailResponse['OrderDetailsList'][number] {
    const source = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    return {
      OrderDetailID: this.pickNumber(source, ['OrderDetailID', 'OrderDetailId', 'orderDetailId']) ?? 0,
      OrderID: this.pickNumber(source, ['OrderID', 'OrderId', 'orderId']) ?? 0,
      ItemID: this.pickNumber(source, ['ItemID', 'ItemId', 'itemId']) ?? 0,
      ItemName: this.pickString(source, ['ItemName', 'itemName']) ?? '',
      ItemCategory: this.pickString(source, ['ItemCategory', 'itemCategory']) ?? '',
      UnitPrice: this.pickNumber(source, ['UnitPrice', 'unitPrice']) ?? 0,
      Quantity: this.pickNumber(source, ['Quantity', 'quantity']) ?? 0,
      LineTotal: this.pickNumber(source, ['LineTotal', 'lineTotal']) ?? 0,
      SpecialInstructions: this.pickNullableString(source, ['SpecialInstructions', 'specialInstructions']),
      DisplayOrder: this.pickNumber(source, ['DisplayOrder', 'displayOrder']) ?? 0,
      CreatedAt: this.pickString(source, ['CreatedAt', 'createdAt']) ?? ''
    };
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    return null;
  }

  private pickNullableString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (value === null) {
        return null;
      }

      if (typeof value === 'string') {
        return value;
      }
    }

    return null;
  }

  private pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }
}
