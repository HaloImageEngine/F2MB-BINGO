import { Routes } from '@angular/router';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'overview' },
	{
		path: 'login',
		loadComponent: () =>
			import('./pages/login/login.component').then(m => m.LoginComponent)
	},
	{
		path: 'register',
		loadComponent: () =>
			import('./pages/register/register.component').then(m => m.RegisterComponent)
	},
	{
		path: 'overview',
		loadComponent: () =>
			import('./pages/overview/overview.component').then(m => m.OverviewComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'customers',
		loadComponent: () =>
			import('./pages/customers/customers.component').then(m => m.CustomersComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'customer-list',
		loadComponent: () =>
			import('./pages/customers/customer.component').then(m => m.CustomerComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'settings',
		loadComponent: () =>
			import('./pages/settings/settings.component').then(m => m.SettingsComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'cards',
		loadComponent: () =>
			import('./pages/cards/cards.component').then(m => m.CardsComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'slidecards',
		loadComponent: () =>
			import('./pages/slidecardsw/slidecardsw.component').then(m => m.SlidecardswComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'topslidecards',
		loadComponent: () =>
			import('./pages/topslidecards/topslidecards.component').then(m => m.TopslidecardsComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'slidecardone',
		loadComponent: () =>
			import('./pages/slidecardone/slidecardone.component').then(m => m.SlidecardoneComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'qr-generator',
		loadComponent: () =>
			import('./pages/qr-generator/qr-generator.component').then(m => m.QrGeneratorComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'sponsor-page',
		loadComponent: () =>
			import('./pages/sponsor-page/sponsor-page.component').then(m => m.SponsorPageComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/songs',
		loadComponent: () =>
			import('./pages/songs/songslist.component').then(m => m.SongsListComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/create-master-withsonglist',
		loadComponent: () =>
			import('./pages/create-master_withsongs/create-master-withsongs.component').then(m => m.CreateSongListComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/edit-song-list',
		loadComponent: () =>
			import('./pages/edit-song-list/edit-song-list.component').then(m => m.EditSongListComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/create-call-list',
		loadComponent: () =>
			import('./pages/review-call-list/review-call-list.component').then(m => m.CreateCallListComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/insert-song-single',
		loadComponent: () =>
			import('./pages/insert-song-single/insert-song-single.component').then(m => m.InsertSongSingleComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/insert-song-bulk',
		loadComponent: () =>
			import('./pages/insert-song-bulk/insert-song-bulk.component').then(m => m.InsertSongBulkComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/songs/:songId',
		loadComponent: () =>
			import('./pages/songs/songdetail.component').then(m => m.SongDetailComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/card-master',
		loadComponent: () =>
			import('./pages/card-master/card-master.component').then(m => m.CardMasterComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'card-overview',
		loadComponent: () =>
			import('./pages/card-overview/card-overview.component').then(m => m.CardOverviewComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/game-master',
		loadComponent: () =>
			import('./pages/game-master/game-master.component').then(m => m.GameMasterComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/clsong-review',
		loadComponent: () =>
			import('./pages/clsong-review/clsong-review.component').then(m => m.ClsongReviewComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console',
		loadComponent: () =>
			import('./pages/console/console.component').then(m => m.ConsoleComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'thumbnails',
		loadComponent: () =>
			import('./pages/thumbnails/thumbnails.component').then(m => m.ThumbnailsComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'thumbnail-detail/:id',
		loadComponent: () =>
			import('./pages/thumbnail-detail/thumbnail-detail.component').then(m => m.ThumbnailDetailComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'music-bingo-schema',
		loadComponent: () =>
			import('./pages/music-bingo-schema/music-bingo-schema.component').then(m => m.MusicBingoSchemaComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'music-bingo-guideline',
		loadComponent: () =>
			import('./pages/music-bingo-guideline/music-bingo-guideline.component').then(m => m.MusicBingoGuidelineComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'how-to-play',
		loadComponent: () =>
			import('./pages/howtoplay/howtoplay.component').then(m => m.HowToPlayComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'get-audit-records',
		loadComponent: () =>
			import('./pages/get-audit-records/get-audit-records.component').then(m => m.GetAuditRecordsComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'admin',
		loadComponent: () =>
			import('./pages/admin/admin.component').then(m => m.AdminComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'get-pid',
		loadComponent: () =>
			import('./pages/get-pid/get-pid.component').then(m => m.GetPidComponent),
		canActivate: [AuthGuard]
	},
	{ path: 'app/music_bingo_schema.html', redirectTo: 'music-bingo-schema', pathMatch: 'full' },
	{ path: 'app/music_bingo_chat.html', redirectTo: 'music-bingo-guideline', pathMatch: 'full' },
	{ path: '**', redirectTo: 'overview' }
];
