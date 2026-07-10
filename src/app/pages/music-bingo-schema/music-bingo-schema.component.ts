import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
	selector: 'app-music-bingo-schema',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './music-bingo-schema.component.html',
	styleUrl: './music-bingo-schema.component.scss'
})
export class MusicBingoSchemaComponent {
	readonly schemaUrl: SafeResourceUrl;

	constructor(sanitizer: DomSanitizer) {
		this.schemaUrl = sanitizer.bypassSecurityTrustResourceUrl('assets/music_bingo_schema.html');
	}
}
