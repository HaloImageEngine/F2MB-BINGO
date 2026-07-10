import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { SongObj } from '../../models/song-obj.model';

interface BingoSlot {
  position: number;
  song: SongObj | null;
}

@Component({
  selector: 'app-bingo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bingo.component.html',
  styleUrl: './bingo.component.scss'
})
export class BingoComponent {
  readonly slots: BingoSlot[] = Array.from({ length: 25 }, (_, index) => ({
    position: index + 1,
    song: null
  }));
}
