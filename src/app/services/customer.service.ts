import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Customer } from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly customersApiUrl = environment.customersApiUrl;

  getCustomers(userAlias = 'All'): Observable<Customer[]> {
    const params = new HttpParams().set('useralias', userAlias);
    return this.http.get<Customer[]>(this.customersApiUrl, { params });
  }
}
