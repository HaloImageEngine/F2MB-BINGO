import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustDetailComponent } from './custdetail.component';
import { Customer } from '../../models/customer.model';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, CustDetailComponent],
  templateUrl: './customer.component.html',
  styleUrl: './customer.component.scss'
})
export class CustomerComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly destroyRef = inject(DestroyRef);

  customers: Customer[] = [];
  loading = true;
  error: string | null = null;
  selectedCustomer: Customer | null = null;

  ngOnInit(): void {
    this.customerService.getCustomers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.customers = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load customers.';
          this.loading = false;
        }
      });
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer;
  }
}
