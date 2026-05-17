import { ChangeDetectionStrategy, Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService } from './data';

@Component({
  selector: 'app-album-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entry(); as item) {
      <div class="max-w-5xl mx-auto px-6 py-24 min-h-screen animate-in fade-in duration-700">
        <header class="mb-16 flex flex-col items-center text-center">
          <a routerLink="/" class="material-icons opacity-20 hover:opacity-100 transition-opacity mb-8 cursor-pointer">arrow_back</a>
          <h1 class="text-3xl font-bold tracking-[0.2em] uppercase mb-2">{{ item.title }}</h1>
          <p class="text-[10px] tracking-[0.3em] uppercase opacity-40">{{ item.credits }}</p>
        </header>

        <!-- Dynamic Grid / Collage -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-[300px]">
          @for (photo of item.photos; track photo; let i = $index) {
            <button 
              type="button"
              (click)="openPhoto(photo)"
              class="relative group overflow-hidden border border-brand-border bg-brand-card-bg cursor-zoom-in w-full h-full block text-left transition-all duration-500 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1 hover:z-10"
              [class.md:col-span-12]="i === 0"
              [class.md:row-span-2]="i === 0"
              [class.md:col-span-8]="i % 3 === 1"
              [class.md:col-span-4]="i % 3 === 2"
              [class.md:col-span-6]="i % 3 === 0 && i !== 0"
            >
              <img 
                [src]="photo" 
                alt="Album photo"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerpolicy="no-referrer"
              />
            </button>
          }
        </div>

        <footer class="mt-32 text-center">
          <button routerLink="/" class="text-[11px] font-bold tracking-[0.2em] uppercase border-b-2 border-brand-primary pb-2 hover:opacity-50 transition-opacity">Return to archive</button>
        </footer>
      </div>

      <!-- Fullscreen Lightbox -->
      @if (selectedPhoto(); as url) {
        <div 
          class="fixed inset-0 z-[100] bg-brand-bg/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300"
          (click)="onBackdropClick($event)"
          role="dialog"
          aria-modal="true"
          tabindex="0"
          (keydown.escape)="closePhoto()"
        >
          <!-- Close Button -->
          <button 
            type="button"
            (click)="closePhoto()" 
            class="absolute top-8 right-8 z-[110] material-icons text-brand-primary opacity-40 hover:opacity-100 transition-all hover:scale-110"
            aria-label="Close"
          >
            close
          </button>

          <!-- Navigation: Prev -->
          <button 
            type="button"
            (click)="prevPhoto($event)" 
            class="absolute left-4 md:left-8 z-[110] material-icons text-4xl text-brand-primary opacity-20 hover:opacity-100 transition-all hover:scale-110"
            aria-label="Previous photo"
          >
            chevron_left
          </button>

          <!-- Navigation: Next -->
          <button 
            type="button"
            (click)="nextPhoto($event)" 
            class="absolute right-4 md:right-8 z-[110] material-icons text-4xl text-brand-primary opacity-20 hover:opacity-100 transition-all hover:scale-110"
            aria-label="Next photo"
          >
            chevron_right
          </button>
          
          <div class="relative max-w-full max-h-full flex items-center justify-center pointer-events-none">
            <img 
              [src]="url" 
              class="max-w-full max-h-[90vh] object-contain shadow-2xl animate-in zoom-in-95 duration-500 pointer-events-auto" 
              alt="Full view"
            />
          </div>

          <!-- Counter -->
          <div class="absolute bottom-8 text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">
            {{ currentIndex() + 1 }} / {{ item.photos.length }}
          </div>
        </div>
      }
    } @else {
      <div class="flex items-center justify-center min-h-screen">
        <p class="text-[10px] tracking-widest uppercase opacity-40">Entry not found</p>
      </div>
    }
  `
})
export class AlbumView {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private platformId = inject(PLATFORM_ID);
  
  selectedPhoto = signal<string | null>(null);

  entryId = this.route.snapshot.params['id'];
  entry = this.dataService.getEntryById(this.entryId);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.selectedPhoto()) return;
    
    if (event.key === 'ArrowRight') this.nextPhoto();
    if (event.key === 'ArrowLeft') this.prevPhoto();
    if (event.key === 'Escape') this.closePhoto();
  }

  currentIndex() {
    const url = this.selectedPhoto();
    if (!url || !this.entry()) return -1;
    return this.entry()!.photos.indexOf(url);
  }

  nextPhoto(event?: Event) {
    event?.stopPropagation();
    const photos = this.entry()?.photos || [];
    if (photos.length === 0) return;
    
    const nextIdx = (this.currentIndex() + 1) % photos.length;
    this.selectedPhoto.set(photos[nextIdx]);
  }

  prevPhoto(event?: Event) {
    event?.stopPropagation();
    const photos = this.entry()?.photos || [];
    if (photos.length === 0) return;
    
    const prevIdx = (this.currentIndex() - 1 + photos.length) % photos.length;
    this.selectedPhoto.set(photos[prevIdx]);
  }

  openPhoto(url: string) {
    this.selectedPhoto.set(url);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closePhoto() {
    this.selectedPhoto.set(null);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closePhoto();
    }
  }
}
