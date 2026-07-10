import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { BingoComponent } from '../cardsingle/bingo.component';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, BingoComponent],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss'
})
export class CardsComponent {
  readonly cardLabels = ['Card A', 'Card B'];
}
