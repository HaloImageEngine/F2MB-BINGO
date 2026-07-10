import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface AutomationRule {
  title: string;
  detail: string;
  enabled: boolean;
}

interface AccessItem {
  name: string;
  role: string;
  scope: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  readonly automationRules: AutomationRule[] = [
    { title: 'Menu sync digest', detail: 'Send summary to ops after every publish.', enabled: true },
    { title: 'Courier load alert', detail: 'Notify when any zone exceeds 30 min ETA.', enabled: true },
    { title: 'Campaign quality gate', detail: 'Require asset checklist before launch.', enabled: false }
  ];

  readonly accessList: AccessItem[] = [
    { name: 'Avery Kim', role: 'Menu lead', scope: 'Menus + inventory' },
    { name: 'Jordan Bell', role: 'Marketing ops', scope: 'Campaigns + channels' },
    { name: 'Morgan Lee', role: 'Customer voice', scope: 'Feedback + loyalty' }
  ];
}
