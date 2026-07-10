import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-howtoplay',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './howtoplay.component.html',
  styleUrl: './howtoplay.component.scss'
})
export class HowToPlayComponent {
  readonly guideImageSrc = 'assets/images/FamilyInfoGraphics.png';
  readonly guideImageAlt =
    'Family Bingo guide: how to play, mark cards, and win at holiday and family gatherings';
}
