import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService, Entry } from './data';
import { AudioService } from './audio';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="isAuthorized() ? 'bg-brand-bg text-brand-primary max-w-6xl mx-auto px-6 py-24 min-h-screen' : 'fixed inset-0 overflow-hidden flex items-center justify-center px-6 bg-brand-bg z-[100] text-brand-primary'">
      @if (isAuthorized()) {
        <header class="mb-16 flex justify-between items-baseline border-b border-brand-border pb-8">
          <div>
            <h1 class="text-2xl font-bold tracking-[0.2em] uppercase">Control Panel</h1>
            <p class="text-[10px] tracking-[0.3em] uppercase opacity-40">Gallery & Profile</p>
          </div>
          <div class="flex gap-8 items-center">
            <div class="hidden md:flex items-center gap-2">
              <span class="text-[8px] tracking-widest uppercase opacity-40">System:</span>
              @switch (dataService.dbStatus()) {
                @case ('connected') { <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> }
                @case ('checking') { <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> }
                @default { <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> }
              }
            </div>
            <div class="flex gap-8 items-baseline">
              <button (click)="logout()" class="text-[10px] tracking-widest uppercase opacity-20 hover:opacity-100 transition-opacity">Logout</button>
              <a routerLink="/" class="text-[11px] font-bold tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity">Exit</a>
            </div>
          </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <aside class="lg:col-span-3 space-y-16">
            <section class="space-y-8">
              <h3 class="text-[11px] font-bold tracking-widest uppercase opacity-40">Insights</h3>
              <div class="p-6 border border-brand-border bg-brand-card-bg rounded-xl">
                <div class="flex items-center gap-4">
                  <span class="material-icons text-brand-primary opacity-20">visibility</span>
                  <div>
                    <h4 class="text-[18px] font-bold tracking-tight">{{ profile().views | number }}</h4>
                    <p class="text-[9px] tracking-widest uppercase opacity-40 font-bold">Total Page Views</p>
                  </div>
                </div>
              </div>

              <h3 class="text-[11px] font-bold tracking-widest uppercase opacity-40">Profile Settings</h3>
              <div class="flex flex-col items-center gap-6 p-6 border border-brand-border bg-brand-card-bg rounded-xl text-center">
                <button type="button" class="relative group cursor-pointer" (click)="avatarInput.click()" aria-label="Change avatar">
                  <img [src]="profile().avatarUrl" alt="Avatar" class="w-24 h-24 rounded-2xl object-cover border-2 border-brand-bg shadow-md group-hover:opacity-80 transition-opacity" />
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="material-icons text-brand-primary text-xl">photo_camera</span>
                  </div>
                </button>
                <input #avatarInput type="file" (change)="onAvatarSelected($event)" class="hidden" accept="image/*" />

                <div class="w-full space-y-4">
                  <input
                    #profileName
                    type="text"
                    [value]="profile().name"
                    (blur)="dataService.updateProfile({ name: profileName.value, avatarUrl: profile().avatarUrl })"
                    (keyup.enter)="dataService.updateProfile({ name: profileName.value, avatarUrl: profile().avatarUrl }); profileName.blur()"
                    class="w-full bg-transparent border-b border-brand-primary/10 py-2 text-center text-[13px] font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary transition-colors"
                    placeholder="DISPLAY NAME"
                  />
                  <p class="text-[8px] tracking-[0.2em] uppercase opacity-40">Click name to edit</p>
                  <div class="pt-6 border-t border-brand-border mt-4">
                    <div class="flex items-center justify-between">
                      <span class="text-[9px] tracking-widest uppercase opacity-40 font-bold">Dark Mode</span>
                      <button
                        type="button"
                        (click)="dataService.updateProfile({ isDarkMode: !profile().isDarkMode })"
                        class="w-8 h-4 rounded-full relative transition-colors duration-300 focus:outline-none shadow-inner"
                        [class]="profile().isDarkMode ? 'bg-emerald-500' : 'bg-brand-primary/10'"
                      >
                        <div
                          class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300"
                          [class.translate-x-4]="profile().isDarkMode"
                        ></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="space-y-12">
              <div>
                <h3 class="text-[11px] font-bold tracking-widest uppercase mb-6 opacity-40">Admin Music</h3>
                <div class="p-6 border border-brand-border bg-brand-card-bg rounded-xl space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] tracking-widest uppercase opacity-40 font-bold">Admin Music (MP3)</span>
                    <button type="button" (click)="musicFileInput.click()" class="material-icons text-lg opacity-40 hover:opacity-100 transition-opacity">library_music</button>
                    <input #musicFileInput type="file" (change)="onMusicSelected($event)" class="hidden" accept=".mp3,.mpeg,.mpg,audio/*" />
                  </div>
                  @if (profile().musicUrl) {
                    <div class="pt-4 border-t border-black/5 space-y-4">
                      <div class="flex items-center gap-4">
                        <button type="button" (click)="audioService.toggle()" class="material-icons text-3xl text-brand-primary/80 hover:scale-110 transition-transform">
                          {{ audioService.isPlaying() ? 'pause_circle' : 'play_circle' }}
                        </button>
                        <div class="flex-1 space-y-2">
                          <div class="flex justify-between items-center pr-1">
                            <span class="text-[8px] font-mono opacity-40">
                              @if (audioService.loadError()) {
                                <span class="text-red-500">{{ audioService.loadError() }}</span>
                              } @else if (audioService.isStalled()) {
                                <span class="animate-pulse">Loading...</span>
                              } @else {
                                {{ formatTime(audioService.currentTime()) }} / {{ audioService.duration() > 0 ? formatTime(audioService.duration()) : '--:--' }}
                              }
                            </span>
                            <div class="flex gap-2">
                              <button type="button" (click)="audioService.toggleLoop()" class="material-icons text-xs transition-colors" [class]="audioService.isLooping() ? 'text-brand-primary opacity-100' : 'text-brand-primary opacity-20'" title="Toggle Repeat">repeat</button>
                              <button type="button" (click)="dataService.updateProfile({ musicUrl: '' })" class="material-icons text-xs opacity-20 hover:opacity-100 transition-opacity text-red-600" title="Remove Audio">delete</button>
                            </div>
                          </div>
                          <input type="range" [value]="audioService.currentTime()" [max]="audioService.duration() || 1" (input)="onSeek($event)" class="w-full h-1.5 bg-brand-primary/5 rounded-full appearance-none cursor-pointer accent-brand-primary" />
                        </div>
                      </div>
                      <div class="flex items-center gap-4 bg-brand-primary/5 p-3 rounded-lg">
                        <span class="material-icons text-sm opacity-40">volume_up</span>
                        <input type="range" min="0" max="1" step="0.01" [value]="audioService.volume()" (input)="onVolume($event)" class="flex-1 h-1 bg-brand-primary/10 rounded-full appearance-none cursor-pointer accent-brand-primary/60" />
                        <span class="text-[9px] font-mono opacity-40 w-8 text-right">{{ (audioService.volume() * 100) | number:'1.0-0' }}%</span>
                      </div>
                    </div>
                  } @else {
                    <p class="text-[8px] tracking-widest uppercase opacity-20">Click the icon to upload</p>
                  }
                </div>
              </div>

              <div>
                <div class="flex justify-between items-center mb-6">
                  <h3 class="text-[11px] font-bold tracking-widest uppercase opacity-40">Categories</h3>
                  <button (click)="dataService.refreshCategories()" class="material-icons text-xs opacity-20 hover:opacity-100 transition-opacity">refresh</button>
                </div>
                <div class="space-y-4">
                  @for (cat of categories(); track cat.id) {
                    <div class="flex justify-between items-center group py-2">
                      <div class="flex items-center gap-3">
                        <span class="text-sm font-medium opacity-80" [class.opacity-30]="deletingIds().has(cat.id)">{{ cat.name }}</span>
                        @if (showDeleteConfirm() === cat.id) {
                          <div class="flex items-center gap-2">
                            <button (click)="doDeleteCategory($event, cat.id)" class="text-[9px] font-bold tracking-widest uppercase bg-red-500 text-white px-2 py-1 rounded" [disabled]="deletingIds().has(cat.id)">
                              {{ deletingIds().has(cat.id) ? 'Deleting...' : 'Confirm' }}
                            </button>
                            <button (click)="cancelDelete($event)" class="text-[9px] font-bold tracking-widest uppercase opacity-40 hover:opacity-100 transition-opacity">No</button>
                          </div>
                        }
                        @if (deletingIds().has(cat.id)) {
                          <span class="material-icons text-xs animate-spin opacity-20">sync</span>
                        }
                      </div>
                      @if (cat.id !== 'all' && showDeleteConfirm() !== cat.id && !deletingIds().has(cat.id)) {
                        <button (click)="confirmDeleteCategory($event, cat)" class="material-icons text-[18px] opacity-0 group-hover:opacity-40 hover:opacity-100 transition-all hover:text-red-500 cursor-pointer p-1">delete</button>
                      }
                    </div>
                  }
                </div>
                <div class="mt-8 pt-8 border-t border-brand-border">
                  <div class="flex gap-2 items-center">
                    <input #catInput type="text" placeholder="NEW CATEGORY"
                      class="flex-1 bg-transparent border-b border-brand-primary/10 py-2 text-xs font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary transition-colors placeholder:opacity-20"
                      (keydown.enter)="addCategory(catInput); $event.preventDefault()" />
                    <button type="button" (click)="addCategory(catInput)" class="material-icons text-xl opacity-40 hover:opacity-100 transition-all text-brand-primary">add_circle</button>
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <main class="lg:col-span-9">
            <div class="flex justify-between items-center mb-12">
              <h3 class="text-[11px] font-bold tracking-widest uppercase opacity-40">Gallery Entries</h3>
              <button (click)="resetAndShowForm()" class="bg-brand-primary text-brand-bg px-6 py-3 rounded-full text-[10px] font-bold tracking-widest uppercase hover:opacity-80 transition-opacity">Add New</button>
            </div>

            @if (showForm()) {
              <form [formGroup]="entryForm" (ngSubmit)="saveEntry()" class="bg-brand-card-bg p-8 mb-16 space-y-8 border border-brand-border rounded-xl">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div class="space-y-6">
                    <input type="text" formControlName="title" placeholder="TITLE" class="w-full bg-transparent border-b border-brand-primary/10 py-3 text-[11px] font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary placeholder:opacity-20" />
                    <input type="text" formControlName="credits" placeholder="CREDITS" class="w-full bg-transparent border-b border-brand-primary/10 py-3 text-[11px] font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary placeholder:opacity-20" />
                    <select formControlName="categoryId" class="w-full bg-transparent border-b border-brand-primary/10 py-3 text-[11px] font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary">
                      @for (cat of categories(); track cat.id) {
                        <option [value]="cat.id">{{ cat.name }}</option>
                      }
                    </select>
                  </div>
                  <div class="space-y-6">
                    <div class="flex items-center gap-4">
                      <input type="text" formControlName="coverUrl" placeholder="COVER URL" class="flex-1 bg-transparent border-b border-brand-primary/10 py-3 text-[11px] font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary placeholder:opacity-20" />
                      <button type="button" (click)="coverInput.click()" [disabled]="processingFiles()" class="material-icons opacity-40 hover:opacity-100 transition-opacity disabled:opacity-10">add_a_photo</button>
                      <input #coverInput type="file" (change)="onFileSelected($event, 'cover')" class="hidden" accept="image/*" />
                    </div>
                    <div class="space-y-2">
                      <div class="flex items-center justify-between">
                        <label class="text-[9px] tracking-widest uppercase opacity-40 font-bold">Additional Photos</label>
                        <div class="flex items-center gap-4">
                          <button type="button" (click)="entryForm.patchValue({photosRaw: ''})" class="text-[8px] tracking-widest uppercase opacity-20 hover:opacity-100 transition-opacity">Clear All</button>
                          @if (processingFiles()) { <span class="material-icons text-xs animate-spin opacity-40">sync</span> }
                          <button type="button" (click)="photosInput.click()" [disabled]="processingFiles()" class="material-icons opacity-40 hover:opacity-100 transition-opacity disabled:opacity-10">library_add</button>
                        </div>
                        <input #photosInput type="file" (change)="onFileSelected($event, 'photos')" class="hidden" multiple accept="image/*" />
                      </div>
                      <textarea formControlName="photosRaw" placeholder="ONE URL PER LINE" rows="6" class="w-full bg-transparent border-b border-brand-primary/10 py-3 text-[11px] font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary placeholder:opacity-20 resize-y min-h-[120px]"></textarea>
                    </div>
                  </div>
                </div>
                <div class="flex gap-4 pt-4">
                  <button type="submit" [disabled]="entryForm.invalid" class="bg-brand-primary text-brand-bg px-8 py-4 rounded-full text-[10px] font-bold tracking-widest uppercase disabled:opacity-20">
                    {{ editingId() ? 'Update Entry' : 'Create Entry' }}
                  </button>
                  <button type="button" (click)="cancelEdit()" class="px-8 py-4 text-[10px] font-bold tracking-widest uppercase opacity-40 hover:opacity-100 transition-opacity">Cancel</button>
                </div>
              </form>
            }

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              @for (entry of entries(); track entry.id) {
                <div class="group relative aspect-video overflow-hidden border border-brand-border bg-brand-card-bg hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                  <img [src]="entry.coverUrl" [alt]="entry.title" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerpolicy="no-referrer" />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button (click)="editEntry(entry)" class="material-icons text-white hover:scale-110 transition-transform">edit</button>
                    <button (click)="dataService.deleteEntry(entry.id)" class="material-icons text-white hover:scale-110 transition-transform">delete</button>
                  </div>
                  <button type="button" (click)="$event.stopPropagation(); openPhotoManager(entry)" class="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white hover:bg-black transition-all z-10 shadow-xl border border-white/10">
                    <span class="material-icons text-[14px]">photo_library</span>
                    <span class="text-[9px] font-bold tracking-widest uppercase">{{ entry.photos.length }} photos</span>
                  </button>
                  <div class="absolute bottom-4 left-4">
                    <h4 class="text-[10px] font-bold tracking-widest uppercase text-white shadow-sm">{{ entry.title }}</h4>
                  </div>
                </div>
              }
            </div>
          </main>
        </div>

        @if (managingPhotos(); as entry) {
          <div class="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div class="bg-brand-bg w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-brand-border">
              <header class="p-6 border-b border-brand-border flex justify-between items-center bg-brand-card-bg">
                <div>
                  <h3 class="text-sm font-bold tracking-widest uppercase">{{ entry.title }}</h3>
                  <p class="text-[9px] tracking-widest uppercase opacity-40 mt-1">Managing {{ entry.photos.length }} Photos</p>
                </div>
                <button (click)="closePhotoManager()" class="material-icons opacity-40 hover:opacity-100 transition-opacity">close</button>
              </header>
              <div class="flex-1 overflow-y-auto p-8">
                @if (entry.photos.length === 0) {
                  <div class="h-64 flex flex-col items-center justify-center opacity-20 gap-4">
                    <span class="material-icons text-4xl">no_photography</span>
                    <p class="text-[10px] tracking-widest uppercase font-bold">No photos in this entry</p>
                  </div>
                } @else {
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                    @for (photo of entry.photos; track photo) {
                      <div class="relative aspect-square group rounded-xl overflow-hidden border border-brand-border bg-brand-card-bg">
                        <img [src]="photo" alt="Photo" class="w-full h-full object-cover" />
                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button (click)="removePhoto(photo)" class="bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                            <span class="material-icons">delete</span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
              <footer class="p-6 border-t border-brand-border bg-brand-card-bg text-center">
                <button (click)="closePhotoManager()" class="bg-brand-primary text-brand-bg px-8 py-3 rounded-full text-[10px] font-bold tracking-widest uppercase hover:opacity-80 transition-opacity">Done</button>
              </footer>
            </div>
          </div>
        }

      } @else {
        <div class="w-full max-w-sm space-y-12 text-center">
          <header>
            <h2 class="text-xl font-bold tracking-[0.3em] uppercase mb-2">Restricted Access</h2>
            <p class="text-[9px] tracking-[0.4em] uppercase opacity-40">Identity Verification Required</p>
          </header>
          <div class="space-y-4">
            <input #passInput type="password" placeholder="ENTER PASSWORD"
              class="w-full bg-transparent border-b border-brand-primary text-center py-4 text-[11px] font-bold tracking-[0.4em] uppercase focus:outline-none placeholder:opacity-20 transition-all font-mono"
              (keyup.enter)="checkPassword(passInput.value)" />
            @if (loginError()) {
              <p class="text-[8px] tracking-widest uppercase text-red-500 animate-pulse font-bold">Invalid Password</p>
            }
          </div>
          <button (click)="checkPassword(passInput.value)" class="w-full bg-brand-primary text-brand-bg px-8 py-4 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase hover:opacity-80 transition-opacity flex items-center justify-center gap-3">
            <span class="material-icons">lock_open</span>
            Authorize
          </button>
          <div class="pt-12">
            <a routerLink="/" class="text-[9px] tracking-[0.3em] uppercase opacity-30 hover:opacity-100 transition-opacity cursor-pointer">Return to home</a>
          </div>
        </div>
      }
    </div>
  `
})
export class Dashboard implements OnDestroy {
  fb = inject(FormBuilder);
  dataService = inject(DataService);
  audioService = inject(AudioService);
  platformId = inject(PLATFORM_ID);

  categories   = this.dataService.categories;
  entries      = this.dataService.entries;
  profile      = this.dataService.profile;
  isAuthorized = this.dataService.isAuthorized;
  deletingIds  = this.dataService.deletingIds;

  loginError   = signal(false);
  showForm     = signal(false);
  editingId    = signal<string | null>(null);
  managingPhotos = signal<Entry | null>(null);
  processingFiles = signal(false);
  showDeleteConfirm = signal<string | null>(null);

  entryForm = this.fb.group({
    title:      ['', Validators.required],
    credits:    [''],
    categoryId: ['all', Validators.required],
    coverUrl:   ['', Validators.required],
    photosRaw:  ['']
  });

  constructor() {
    let musicInitialized = false;
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const isAuth = this.isAuthorized();
        const musicUrl = this.profile().musicUrl;
        if (isAuth && musicUrl && !musicInitialized) {
          musicInitialized = true;
          this.audioService.setVolume(0.02);
          this.audioService.setSourceAndPlay(musicUrl);
        } else if (!musicUrl) {
          musicInitialized = false;
        }
      }
    });
  }

  checkPassword(pwd: string) {
    if (this.dataService.authorize(pwd)) {
      this.loginError.set(false);
    } else {
      this.loginError.set(true);
      setTimeout(() => this.loginError.set(false), 3000);
    }
  }

  async onFileSelected(event: Event, target: 'cover' | 'photos') {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.processingFiles.set(true);
    try {
      const files = Array.from(input.files);
      const urls = await Promise.all(files.map(f => this.dataService.uploadImage(f)));
      if (target === 'cover') {
        this.entryForm.patchValue({ coverUrl: urls[0] });
      } else {
        const current = this.entryForm.get('photosRaw')?.value || '';
        this.entryForm.patchValue({ photosRaw: [...(current ? current.split('\n') : []), ...urls].join('\n') });
      }
    } catch (err) {
      alert('Erro no upload');
    } finally {
      this.processingFiles.set(false);
      input.value = '';
    }
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.processingFiles.set(true);
    try {
      const url = await this.dataService.uploadImage(input.files[0]);
      this.dataService.updateProfile({ avatarUrl: url });
    } catch (err) {
      console.error('Avatar upload failed', err);
    } finally {
      this.processingFiles.set(false);
      input.value = '';
    }
  }

  async onMusicSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.processingFiles.set(true);
    try {
      const file = input.files[0];
      const supported = ['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/aac','audio/x-m4a','audio/mp4'];
      const ok = supported.includes(file.type) || /\.(mp3|m4a|wav)$/i.test(file.name);
      if (!ok) { alert('Formato não suportado.'); return; }
      if (file.size > 50 * 1024 * 1024) { alert('Arquivo muito grande (máximo 50MB).'); return; }
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((res, rej) => {
        reader.onload = e => res(e.target?.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      this.dataService.updateProfile({ musicUrl: dataUrl });
      this.audioService.setVolume(0.02);
      this.audioService.setSourceAndPlay(dataUrl);
    } catch (err) {
      console.error('Music upload failed', err);
    } finally {
      this.processingFiles.set(false);
      input.value = '';
    }
  }

  onSeek(event: Event) { this.audioService.seek(Number((event.target as HTMLInputElement).value)); }
  onVolume(event: Event) { this.audioService.setVolume(Number((event.target as HTMLInputElement).value)); }
  formatTime(s: number) { if (!s) return '0:00'; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; }

  addCategory(input: HTMLInputElement) {
    const val = input.value.trim();
    if (val) { this.dataService.addCategory(val); input.value = ''; }
  }

  confirmDeleteCategory(event: MouseEvent, cat: {id: string, name: string}) {
    event.stopPropagation();
    this.showDeleteConfirm.set(cat.id);
  }

  cancelDelete(event: MouseEvent) { event.stopPropagation(); this.showDeleteConfirm.set(null); }

  doDeleteCategory(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.dataService.deleteCategory(id);
    this.showDeleteConfirm.set(null);
  }

  resetAndShowForm() {
    this.editingId.set(null);
    this.entryForm.reset({ categoryId: 'all' });
    this.showForm.set(true);
    if (isPlatformBrowser(this.platformId)) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editEntry(entry: Entry) {
    this.editingId.set(entry.id);
    this.entryForm.patchValue({ title: entry.title, credits: entry.credits, categoryId: entry.categoryId, coverUrl: entry.coverUrl, photosRaw: entry.photos.join('\n') });
    this.showForm.set(true);
    if (isPlatformBrowser(this.platformId)) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveEntry() {
    if (this.entryForm.valid) {
      const v = this.entryForm.value;
      const data = { title: v.title!, credits: v.credits||'', categoryId: v.categoryId!, coverUrl: v.coverUrl!, photos: v.photosRaw?.split('\n').map(s=>s.trim()).filter(Boolean)||[] };
      if (this.editingId()) { this.dataService.updateEntry(this.editingId()!, data); }
      else { this.dataService.addEntry(data); }
      this.cancelEdit();
    }
  }

  cancelEdit() { this.showForm.set(false); this.editingId.set(null); this.entryForm.reset({ categoryId: 'all' }); }

  openPhotoManager(entry: Entry) { this.managingPhotos.set(entry); }
  closePhotoManager() { this.managingPhotos.set(null); }

  removePhoto(photoUrl: string) {
    const current = this.managingPhotos();
    if (!current) return;
    const updated = { ...current, photos: current.photos.filter(p => p !== photoUrl) };
    this.dataService.updateEntry(current.id, updated);
    this.managingPhotos.set(updated);
  }

  logout() { this.dataService.logout(); this.audioService.pause(); }
  ngOnDestroy() { this.audioService.pause(); }
}