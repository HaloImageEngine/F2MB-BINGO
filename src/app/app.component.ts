import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { environment } from '../environments/environment';
import { AuthUserService } from './services/auth-user.service';
import { LoginService } from './services/login.service';

type NavAccent = 'iris' | 'teal' | 'amber' | 'rose';

interface NavItem {
  label: string;
  helper: string;
  path: string;
  accent: NavAccent;
  icon: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  hidden?: boolean;
}


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private static readonly NAV_ALLOWED_ALIASES = new Set(['dj gogi', 'halolu19']);

  @ViewChild('sidebarNav') private sidebarNav?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);
  private readonly authUserService = inject(AuthUserService);
  readonly isLoginRoute = signal(false);
  readonly currentUser = this.authUserService.user;
  readonly showSidebarNav = computed(() => {
    if (this.isLoginRoute()) {
      return false;
    }

    const alias = this.currentUser()?.UserAlias?.trim().toLowerCase();
    return alias != null && AppComponent.NAV_ALLOWED_ALIASES.has(alias);
  });
  private brandCardTimerId: number | undefined;
  private brandCardTitlesTimerId: number | undefined;
  private buildBannerTimerId: number | undefined;
  readonly controlRoomLabel = 'Family Bingo';
  readonly brandCardImagePath = 'assets/images/DJGogi.png';
  /** From `environment.ts` / `environment.prod.ts` — `.T` = dev, `.P` = production build. */
  readonly appVersion = environment.version;
  readonly isProductionBuild = environment.production;
  readonly buildKind = this.isProductionBuild ? 'Production' : 'Development';
  readonly buildTitle = `DJ GOGI Bingo ${this.appVersion} (${this.buildKind})`;

  readonly navSections: NavSection[] = [

    {
      title: 'Operations',
      items: [
        { label: 'Console', helper: 'Bingo game console', path: '/console', accent: 'rose', icon: 'BC' },
        { label: 'Card Overview', helper: 'Existing cards summary by user', path: '/card-overview', accent: 'teal', icon: 'CO' },
        { label: 'Review Call List', helper: 'Review the call list with songs', path: '/console/create-call-list', accent: 'rose', icon: 'RL' },
        { label: 'CL Song Review', helper: 'Call list songs in 4 inning columns', path: '/console/clsong-review', accent: 'rose', icon: 'SR' },
        { label: 'Slide Cards', helper: 'Landscape swipe card pairs', path: '/slidecards', accent: 'teal', icon: 'SC' },
        { label: 'Top Slide Cards', helper: 'Top 5 cards with called squares', path: '/topslidecards', accent: 'teal', icon: 'TC' },
        { label: 'Slide Card One', helper: 'Single printed bingo card', path: '/slidecardone', accent: 'teal', icon: 'S1' },
        { label: 'Card Master', helper: 'Review printed cards by game', path: '/console/card-master', accent: 'teal', icon: 'CM' },
        { label: 'Game Master', helper: 'Load game context (GCI)', path: '/console/game-master', accent: 'teal', icon: 'GM' },
        { label: 'Songs', helper: 'Browse bingo song library', path: '/console/songs', accent: 'teal', icon: 'SG' },
        { label: 'Bulk Insert', helper: 'Paste JSON to add many songs', path: '/console/insert-song-bulk', accent: 'amber', icon: 'BI' },

        { label: 'Cards', helper: 'Two bingo cards view', path: '/cards', accent: 'amber', icon: 'CD' },
        { label: 'How to Play', helper: 'Family and Friends Music Bingo', path: '/how-to-play', accent: 'iris', icon: 'HP' },
        { label: 'Audit Records', helper: 'Latest 20 system audit log entries', path: '/get-audit-records', accent: 'iris', icon: 'AR' },
        { label: 'Admin', helper: 'Status report, audit log, and error log', path: '/admin', accent: 'iris', icon: 'AD' },
        { label: 'Get PID', helper: 'Packet ID list by Game_ID and Call_List_ID', path: '/get-pid', accent: 'teal', icon: 'PI' },
        //{ label: 'MB Schema', helper: 'Music bingo data map', path: '/music-bingo-schema', accent: 'iris', icon: 'DB' },
        //{ label: 'MB Guidelines', helper: 'Music bingo chat transcript', path: '/music-bingo-guideline', accent: 'iris', icon: 'MG' },

        //{ label: 'Settings', helper: 'Automation + access', path: '/settings', accent: 'rose', icon: 'ST' }
      ]
    }
    ,
    {
      title: 'Intelligence',
      hidden: true,
      items: [
        { label: 'Overview', helper: 'Live KPIs & signals', path: '/overview', accent: 'iris', icon: 'OV' },
        { label: 'Marketing', helper: 'Campaign pacing & pulse', path: '/marketing', accent: 'rose', icon: 'MK', badge: 'LIVE' }
      ]
    },
  ];

  isSidebarOpen = false;
  isSidebarCollapsed = false;
  showBrandCardImage = true;
  showBrandCardTitles = true;
  showBuildBanner = true;

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(event => this.isAuthRoute(event.urlAfterRedirects)),
        startWith(this.isAuthRoute(this.router.url)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(isLogin => {
        this.isLoginRoute.set(isLogin);
        document.title = isLogin ? 'DJ GOGI Bingo — Sign in' : this.buildTitle;
        if (!isLogin) {
          afterNextRender(() => this.centerActiveNavLink(), { injector: this.injector });
        }
      });

    this.brandCardTimerId = window.setTimeout(() => {
      this.showBrandCardImage = false;
    }, 4000);

    this.brandCardTitlesTimerId = window.setTimeout(() => {
      this.showBrandCardTitles = false;
    }, 10000);

    this.buildBannerTimerId = window.setTimeout(() => {
      this.showBuildBanner = false;
    }, 8000);

    this.destroyRef.onDestroy(() => {
      if (this.brandCardTimerId !== undefined) {
        window.clearTimeout(this.brandCardTimerId);
      }
      if (this.brandCardTitlesTimerId !== undefined) {
        window.clearTimeout(this.brandCardTitlesTimerId);
      }
      if (this.buildBannerTimerId !== undefined) {
        window.clearTimeout(this.buildBannerTimerId);
      }
    });
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  onNavLinkClick(event: MouseEvent): void {
    const link = event.currentTarget;
    if (link instanceof HTMLElement) {
      this.scrollNavLinkToCenter(link);
    }
    this.closeSidebar();
  }

  private centerActiveNavLink(): void {
    const nav = this.sidebarNav?.nativeElement;
    const active = nav?.querySelector<HTMLElement>('.nav-link.is-active');
    if (active) {
      this.scrollNavLinkToCenter(active);
    }
  }

  private scrollNavLinkToCenter(link: HTMLElement): void {
    link.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  private isAuthRoute(url: string): boolean {
    const path = url.split('?')[0];
    return path === '/login' || path === '/register';
  }

  logoff(): void {
    this.loginService.logoff();
    this.closeSidebar();
    this.router.navigate(['/login']);
  }
}
