import {ChangeDetectionStrategy, Component, inject, effect, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {RouterOutlet, RouterLink, Router, NavigationEnd} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map} from 'rxjs/operators';
import {CommonModule} from '@angular/common';
import {DataService} from './data';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <main [class.min-h-screen]="!isAdminRoute()" class="bg-brand-bg text-brand-primary transition-colors duration-500">
      <router-outlet />
    </main>
    
    @if (!isAdminRoute()) {
      <footer class="py-32 flex flex-col items-center gap-12 border-t border-brand-border/30">
        <p class="text-[10px] tracking-[0.3em] uppercase opacity-20">© 2026 RENATO SANTOS</p>
        <!-- Subtle Admin Trigger -->
        <a routerLink="/admin" class="text-[9px] tracking-[0.5em] uppercase opacity-[0.15] hover:opacity-100 transition-all cursor-pointer select-none font-bold text-brand-primary px-4 py-2 border border-transparent hover:border-brand-primary/5 rounded">
          Renato.Admin
        </a>
      </footer>
    }
  `
})
export class App {
  router = inject(Router);
  dataService = inject(DataService);
  platformId = inject(PLATFORM_ID);

  isAdminRoute = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/admin'))
    ),
    { initialValue: false }
  );

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const isDark = this.dataService.profile().isDarkMode;
        if (isDark) {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark');
        }
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      // Increment views only once per session/load in the browser
      this.dataService.incrementViews();
    }
  }
}
