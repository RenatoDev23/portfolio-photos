import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from './data';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
      <!-- Profile -->
      <div class="w-32 h-32 rounded-2xl overflow-hidden mb-8 border border-brand-border">
        <img 
          [src]="profile().avatarUrl" 
          [alt]="profile().name"
          class="w-full h-full object-cover"
        />
      </div>

      <h1 class="text-3xl font-bold tracking-widest uppercase mb-4">{{ profile().name }}</h1>
      <p class="text-[11px] font-bold tracking-[0.3em] uppercase opacity-60 mb-12">Gallery & Profile</p>

      <div class="w-24 h-px bg-brand-border mb-16"></div>

      <!-- Categories -->
      <div class="flex flex-wrap justify-center gap-10 mb-20 text-[11px] font-bold tracking-widest uppercase">
        @for (cat of categories(); track cat.id) {
          <button 
            (click)="filter.set(cat.id)"
            [class.opacity-100]="filter() === cat.id"
            [class.border-b-2]="filter() === cat.id"
            class="pb-2 border-brand-primary opacity-40 hover:opacity-100 transition-all font-bold"
          >
            {{ cat.name }}
          </button>
        }
      </div>

      <!-- Feed -->
      <div class="w-full grid grid-cols-2 gap-4 md:gap-8">
        @for (entry of filteredEntries(); track entry.id) {
          <button 
            type="button"
            [routerLink]="['/album', entry.id]" 
            class="group relative aspect-[16/9] overflow-hidden border border-brand-border block w-full text-left cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1 hover:z-10"
          >
            <img 
              [src]="entry.coverUrl" 
              [alt]="entry.title"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerpolicy="no-referrer"
            />
            
            <!-- Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 transition-opacity"></div>
            
            <!-- Text Overlay -->
            <div class="absolute bottom-6 left-6 right-6">
              <h3 class="text-[13px] font-bold tracking-widest uppercase text-white shadow-black">{{ entry.title }}</h3>
              @if (entry.credits) {
                <p class="text-[8px] tracking-[0.2em] uppercase text-white/50 mt-1">{{ entry.credits }}</p>
              }
            </div>

            <!-- Hover State -->
            <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="material-icons text-white/40 text-4xl">remove_red_eye</span>
            </div>
          </button>
        }
      </div>
    </div>
  `
})
export class Gallery {
  dataService = inject(DataService);
  
  filter = signal<string>('all');
  categories = this.dataService.categories;
  entries = this.dataService.entries;
  profile = this.dataService.profile;

  filteredEntries = computed(() => {

  console.log('ENTRIES:', this.entries());

  const f = this.filter();

  if (f === 'all') return this.entries();

  return this.entries().filter(e => e.categoryId === f);

});
}
