import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface CustomerSegment {
  name: string;
  size: string;
  momentum: string;
  note: string;
}

interface VoiceItem {
  guest: string;
  summary: string;
  action: string;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class CustomersComponent {
  readonly segments: CustomerSegment[] = [
    { name: 'Total Number of Customers', size: '200 Customers Count', momentum: '+14% month', note: 'Occasional Orders.' },
    { name: 'Regular Customers', size: '37 Regular Count', momentum: '+6% month', note: 'Weekly Orders' },
    { name: 'Weekly Mailing', size: '180 Weekly Count', momentum: '+3% month', note: 'Responds to weekly emails.' }
  ];

  readonly voices: VoiceItem[] = [
    { guest: 'VIP · L. Torres', summary: 'Craving more vegetarian mains on Tuesdays.', action: 'Review upcoming produce collab.' },
    { guest: 'Courier feedback', summary: 'Need clearer allergen labels on bundles.', action: 'Coordinate with menu QA team.' },
    { guest: 'New subscriber', summary: 'Wants behind-the-scenes prep stories.', action: 'Loop marketing for photo assets.' }
  ];
}
