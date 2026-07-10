import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Customer } from '../../models/customer.model';

@Component({
  selector: 'app-custdetail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custdetail.component.html',
  styleUrl: './custdetail.component.scss'
})
export class CustDetailComponent {
  @Input() customer: Customer | null = null;
}
