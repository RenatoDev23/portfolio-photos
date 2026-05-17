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
              <span class="text-[8px] tracking-widest uppercase opacity-40">System SQL:</span>
              @switch (dataService.dbStatus()) {
                @case ('connected') { <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> }
                @case ('checking') { <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> }
                @default { <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> }
              }
            </div>
            <div class="flex gap-8 items-baseline">
              <button (click)="dataService.logout()" class="text-[10px] tracking-widest uppercase opacity-20 hover:opacity-100 transition-opacity">Logout</button>
              <a routerLink="/" class="text-[11px] font-bold tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity">Exit</a>
            </div>
          </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <!-- Sidebar: Config -->
          <aside class="lg:col-span-3 space-y-16">
            <!-- Profile Section -->
            <section class="space-y-8">
              <h3 class="text-[11px] font-bold tracking-widest uppercase opacity-40">Insights</h3>
              
              <div class="grid grid-cols-1 gap-4">
                <div class="p-6 border border-brand-border bg-brand-card-bg rounded-xl">
                  <div class="flex items-center gap-4">
                    <span class="material-icons text-brand-primary opacity-20">visibility</span>
                    <div>
                      <h4 class="text-[18px] font-bold tracking-tight">{{ profile().views | number }}</h4>
                      <p class="text-[9px] tracking-widest uppercase opacity-40 font-bold">Total Page Views</p>
                    </div>
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
                    (blur)="dataService.updateProfile(profileName.value, profile().avatarUrl)"
                    (keyup.enter)="dataService.updateProfile(profileName.value, profile().avatarUrl); profileName.blur()"
                    class="w-full bg-transparent border-b border-brand-primary/10 py-2 text-center text-[13px] font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary transition-colors"
                    placeholder="DISPLAY NAME"
                  />
                  <p class="text-[8px] tracking-[0.2em] uppercase opacity-40">Click name to edit</p>

                    <div class="pt-6 border-t border-brand-border mt-4">
                      <div class="flex items-center justify-between">
                        <span class="text-[9px] tracking-widest uppercase opacity-40 font-bold">Dark Mode</span>
                        <button 
                          type="button" 
                          (click)="dataService.updateProfile(profile().name, profile().avatarUrl, profile().musicUrl, !profile().isDarkMode)"
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

            <!-- Categories Section -->
            <section class="space-y-12">
              <div>
                <h3 class="text-[11px] font-bold tracking-widest uppercase mb-6 opacity-40">Admin Music</h3>
                <div class="p-6 border border-brand-border bg-brand-card-bg rounded-xl space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] tracking-widest uppercase opacity-40 font-bold">Admin Music (MP3/MPEG)</span>
                    <button type="button" (click)="musicFileInput.click()" class="material-icons text-lg opacity-40 hover:opacity-100 transition-opacity">library_music</button>
                    <input #musicFileInput type="file" (change)="onMusicSelected($event)" class="hidden" accept=".mp3,.mpeg,.mpg,audio/*" />
                  </div>
                  
                  @if (profile().musicUrl) {
                    <div class="pt-4 border-t border-black/5 space-y-4">
                      <!-- Progress & Main Controls -->
                      <div class="flex items-center gap-4">
                        <button 
                          type="button"
                          (click)="audioService.toggle()" 
                          class="material-icons text-3xl text-brand-primary/80 hover:scale-110 transition-transform"
                        >
                          {{ audioService.isPlaying() ? 'pause_circle' : 'play_circle' }}
                        </button>
                        
                        <div class="flex-1 space-y-2">
                          <div class="flex justify-between items-center pr-1">
                             <div class="flex items-center gap-2">
                               @if (audioService.isPlaying()) {
                                 <div class="flex gap-0.5 items-end h-2">
                                   <div class="w-0.5 bg-brand-primary/40 animate-[music-bar_0.8s_ease-in-out_infinite] h-full"></div>
                                   <div class="w-0.5 bg-brand-primary/40 animate-[music-bar_1.1s_ease-in-out_infinite] h-1/2"></div>
                                   <div class="w-0.5 bg-brand-primary/40 animate-[music-bar_0.9s_ease-in-out_infinite] h-3/4"></div>
                                 </div>
                               }
                               <span class="text-[8px] font-mono opacity-40">
                                 @if (audioService.loadError()) {
                                   <span class="text-red-500">{{ audioService.loadError() }}</span>
                                 } @else if (audioService.isStalled()) {
                                   <span class="animate-pulse">Loading Audio...</span>
                                 } @else {
                                   {{ formatTime(audioService.currentTime()) }} / 
                                   {{ audioService.duration() > 0 ? formatTime(audioService.duration()) : '--:--' }}
                                 }
                               </span>
                             </div>
                             <div class="flex gap-2">
                               <button 
                                type="button"
                                (click)="audioService.toggleLoop()" 
                                class="material-icons text-xs transition-colors"
                                [class]="audioService.isLooping() ? 'text-brand-primary opacity-100' : 'text-brand-primary opacity-20'"
                                title="Toggle Repeat"
                              >
                                repeat
                              </button>
                              <button 
                                type="button"
                                (click)="dataService.updateProfile(profile().name, profile().avatarUrl, '')" 
                                class="material-icons text-xs opacity-20 hover:opacity-100 transition-opacity text-red-600"
                                title="Remove Audio"
                              >
                                delete
                              </button>
                             </div>
                          </div>
                          <input 
                            type="range" 
                            [value]="audioService.currentTime()" 
                            [max]="audioService.duration() || 1" 
                            (input)="onSeek($event)"
                            class="w-full h-1.5 bg-brand-primary/5 rounded-full appearance-none cursor-pointer accent-brand-primary"
                          />
                        </div>
                      </div>

                      <!-- Volume Control -->
                      <div class="flex items-center gap-4 bg-brand-primary/5 p-3 rounded-lg">
                        <span class="material-icons text-sm opacity-40">volume_up</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          [value]="audioService.volume()" 
                          (input)="onVolume($event)"
                          class="flex-1 h-1 bg-brand-primary/10 rounded-full appearance-none cursor-pointer accent-brand-primary/60"
                        />
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
                      <span class="text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity" [class.opacity-30]="deletingIds().has(cat.id)">{{ cat.name }}</span>
                      @if (showDeleteConfirm() === cat.id) {
                        <div class="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                          <button 
                            (click)="doDeleteCategory($event, cat.id)" 
                            class="text-[9px] font-bold tracking-widest uppercase bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                            [disabled]="deletingIds().has(cat.id)"
                          >
                            {{ deletingIds().has(cat.id) ? 'Deleting...' : 'Confirm' }}
                          </button>
                          <button 
                            (click)="cancelDelete($event)" 
                            class="text-[9px] font-bold tracking-widest uppercase opacity-40 hover:opacity-100 transition-opacity"
                            [disabled]="deletingIds().has(cat.id)"
                          >
                            No
                          </button>
                        </div>
                      }
                      @if (deletingIds().has(cat.id)) {
                        <span class="material-icons text-xs animate-spin opacity-20">sync</span>
                      }
                    </div>

                    @if (cat.id !== 'all' && showDeleteConfirm() !== cat.id && !deletingIds().has(cat.id)) {
                      <button 
                        (click)="confirmDeleteCategory($event, cat)" 
                        class="material-icons text-[18px] opacity-0 group-hover:opacity-40 hover:opacity-100 transition-all hover:text-red-500 cursor-pointer p-1"
                        title="Delete Category"
                      >
                        delete
                      </button>
                    }
                  </div>
                }
              </div>
              
              <div class="mt-8 pt-8 border-t border-brand-border">
                <div class="flex gap-2 items-center">
                  <input 
                    #catInput 
                    type="text" 
                    placeholder="NEW CATEGORY"
                    class="flex-1 bg-transparent border-b border-brand-primary/10 py-2 text-xs font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary transition-colors placeholder:opacity-20"
                    (keydown.enter)="addCategory(catInput); $event.preventDefault()"
                  />
                  <button 
                    type="button"
                    (click)="addCategory(catInput); $event.stopPropagation()"
                    class="material-icons text-xl opacity-40 hover:opacity-100 hover:scale-110 active:scale-95 transition-all text-brand-primary"
                    title="Add Category"
                  >
                    add_circle
                  </button>
                </div>
              </div>
            </div>
          </section>
          </aside>

          <!-- Main: Entries -->
          <main class="lg:col-span-9">
            <div class="flex justify-between items-center mb-12">
              <h3 class="text-[11px] font-bold tracking-widest uppercase opacity-40">Gallery Entries</h3>
              <button (click)="resetAndShowForm()" class="bg-brand-primary text-brand-bg px-6 py-3 rounded-full text-[10px] font-bold tracking-widest uppercase hover:opacity-80 transition-opacity">Add New</button>
            </div>

            @if (showForm()) {
              <form [formGroup]="entryForm" (ngSubmit)="saveEntry()" class="bg-brand-card-bg p-8 mb-16 space-y-8 animate-in slide-in-from-top-4 duration-500 border border-brand-border rounded-xl">
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
                        <label for="photosRaw" class="text-[9px] tracking-widest uppercase opacity-40 font-bold">Additional Photos</label>
                        <div class="flex items-center gap-4">
                          <button type="button" (click)="entryForm.patchValue({photosRaw: ''})" class="text-[8px] tracking-widest uppercase opacity-20 hover:opacity-100 transition-opacity">Clear All</button>
                          @if (processingFiles()) {
                            <span class="material-icons text-xs animate-spin opacity-40">sync</span>
                          }
                          <button type="button" (click)="photosInput.click()" [disabled]="processingFiles()" class="material-icons opacity-40 hover:opacity-100 transition-opacity disabled:opacity-10">library_add</button>
                        </div>
                        <input #photosInput type="file" (change)="onFileSelected($event, 'photos')" class="hidden" multiple accept="image/*" />
                      </div>
                      <textarea id="photosRaw" formControlName="photosRaw" placeholder="ONE URL PER LINE" rows="12" class="w-full bg-transparent border-b border-brand-primary/10 py-3 text-[11px] font-bold tracking-widest uppercase focus:outline-none focus:border-brand-primary placeholder:opacity-20 resize-y min-h-[200px]"></textarea>
                    </div>
                  </div>
                </div>

                <!-- LIVE PREVIEW SECTION -->
                <div class="pt-8 border-t border-black/5">
                  <h4 class="text-[9px] tracking-[0.3em] uppercase opacity-40 font-bold mb-8">Live Preview</h4>
                  
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <!-- Gallery Preview -->
                    <div class="md:col-span-4 space-y-4">
                      <p class="text-[8px] tracking-widest uppercase opacity-20">Gallery Card</p>
                      <div class="aspect-video relative overflow-hidden border border-brand-border bg-brand-card-bg">
                        @if (entryForm.get('coverUrl')?.value) {
                          <img [src]="entryForm.get('coverUrl')?.value" alt="Cover preview" class="w-full h-full object-cover" />
                        } @else {
                          <div class="w-full h-full flex items-center justify-center opacity-10">
                            <span class="material-icons">image</span>
                          </div>
                        }
                        <div class="absolute bottom-2 left-2">
                          <h4 class="text-[8px] font-bold tracking-widest uppercase text-white drop-shadow-md">{{ entryForm.get('title')?.value || 'Untitled' }}</h4>
                        </div>
                      </div>
                    </div>

                    <!-- Album View Top Preview -->
                    <div class="md:col-span-8 space-y-4">
                      <p class="text-[8px] tracking-widest uppercase opacity-20">Album Header</p>
                      <div class="py-12 px-8 border border-brand-border bg-brand-card-bg text-center space-y-6">
                        <p class="text-[8px] tracking-[0.4em] uppercase opacity-40">Credits: {{ entryForm.get('credits')?.value || 'None' }}</p>
                        <h1 class="text-2xl font-bold tracking-[0.3em] uppercase">{{ entryForm.get('title')?.value || 'Entry Title' }}</h1>
                        <div class="flex flex-wrap justify-center gap-2 max-h-48 overflow-y-auto p-2">
                          @for (url of entryForm.get('photosRaw')?.value?.split('\n'); track $index) {
                            @if (url.trim()) {
                              <img [src]="url.trim()" alt="Preview" class="w-12 h-12 object-cover rounded shadow-sm" />
                            }
                          }
                        </div>
                        <div class="flex justify-center gap-1 opacity-20">
                          <span class="material-icons text-sm">photo_library</span>
                          <span class="text-[10px]">{{ (entryForm.get('photosRaw')?.value?.split('\n')?.length || 0) }} photos</span>
                        </div>
                      </div>
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
                <div class="group relative aspect-video overflow-hidden border border-brand-border bg-brand-card-bg transition-all duration-500 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1 hover:z-10 cursor-default">
                  <img [src]="entry.coverUrl" [alt]="entry.title" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerpolicy="no-referrer" />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button (click)="editEntry(entry)" class="material-icons text-white hover:scale-110 transition-transform">edit</button>
                    <button (click)="dataService.deleteEntry(entry.id)" class="material-icons text-white hover:scale-110 transition-transform">delete</button>
                  </div>
                  
                  <!-- Photo Count & Manager Trigger -->
                  <button 
                    type="button"
                    (click)="$event.stopPropagation(); openPhotoManager(entry)" 
                    class="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white cursor-pointer hover:bg-black transition-all z-10 shadow-xl border border-white/10 group-hover:scale-105"
                  >
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

        <!-- PHOTO MANAGER MODAL -->
        @if (managingPhotos(); as entry) {
          <div class="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
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
                    <p class="text-[10px] tracking-widest uppercase font-bold">No additional photos in this entry</p>
                  </div>
                } @else {
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                    @for (photo of entry.photos; track photo) {
                      <div class="relative aspect-square group rounded-xl overflow-hidden border border-brand-border bg-brand-card-bg">
                        <img [src]="photo" alt="Photo" class="w-full h-full object-cover" />
                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button 
                            (click)="removePhoto(photo)" 
                            class="bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                          >
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
        <div class="w-full max-w-sm space-y-12 text-center animate-in fade-in duration-1000">
          <header>
              <h2 class="text-xl font-bold tracking-[0.3em] uppercase mb-2">Restricted Access</h2>
              <p class="text-[9px] tracking-[0.4em] uppercase opacity-40">Identity Verification Required</p>
            </header>
            
            <div class="space-y-4">
              <input 
                #passInput
                type="password" 
                placeholder="ENTER PASSWORD"
                class="w-full bg-transparent border-b border-brand-primary text-center py-4 text-[11px] font-bold tracking-[0.4em] uppercase focus:outline-none placeholder:opacity-20 transition-all font-mono"
                (keyup.enter)="checkPassword(passInput.value)"
              />
              @if (loginError()) {
                <p class="text-[8px] tracking-widest uppercase text-red-500 animate-pulse font-bold">Invalid Password</p>
              }
            </div>

            <button 
              (click)="checkPassword(passInput.value)"
              class="w-full bg-brand-primary text-brand-bg px-8 py-4 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase hover:opacity-80 transition-opacity flex items-center justify-center gap-3"
            >
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
  
  categories = this.dataService.categories;
  entries = this.dataService.entries;
  profile = this.dataService.profile;
  isAuthorized = this.dataService.isAuthorized;
  
  loginError = signal(false);

  showForm = signal(false);
  editingId = signal<string | null>(null);
  managingPhotos = signal<Entry | null>(null);
  processingFiles = signal(false);
  deletingIds = this.dataService.deletingIds;

  entryForm = this.fb.group({
    title: ['', Validators.required],
    credits: [''],
    categoryId: ['all', Validators.required],
    coverUrl: ['', Validators.required],
    photosRaw: ['']
  });

  constructor() {
    // Auto-play music when authorized - STABILIZED to avoid duplicate intervals/listeners
    let musicInitialized = false;
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const isAuth = this.isAuthorized();
        const profile = this.profile();
        const musicUrl = profile.musicUrl;
        
        // Only run logic if authorized and we haven't initialized this specific URL yet
        if (isAuth && musicUrl && !musicInitialized) {
           musicInitialized = true;
           console.log('Dashboard: Initializing audio playback.');
           
           this.audioService.setVolume(0.02);
           this.audioService.setSourceAndPlay(musicUrl);

           // Use a single timeout retry instead of a blind interval
           setTimeout(() => {
             if (!this.audioService.isPlaying()) {
               this.audioService.play();
             }
           }, 2000);

           // Single set of interaction listeners
           const resumeOptions = ['click', 'keydown', 'mousedown', 'touchstart'];
           const resumeAudio = () => {
             if (!this.audioService.isPlaying()) {
               console.log('Dashboard: Interaction detected, attempting to resume audio.');
               this.audioService.play();
             }
             resumeOptions.forEach(opt => document.removeEventListener(opt, resumeAudio));
           };
           resumeOptions.forEach(opt => document.addEventListener(opt, resumeAudio, { once: true }));
        } else if (!musicUrl) {
          musicInitialized = false;
        }
      }
    });
  }

  async onFileSelected(event: Event, target: 'cover' | 'photos') {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  this.processingFiles.set(true);

  try {
    const files = Array.from(input.files);

    const uploadedUrls = await Promise.all(
      files.map(file => this.dataService.uploadImage(file))
    );

    if (target === 'cover') {
      this.entryForm.patchValue({
        coverUrl: uploadedUrls[0]
      });
    } else {
      const current =
        this.entryForm.get('photosRaw')?.value || '';

      const newVal = [
        ...(current ? current.split('\n') : []),
        ...uploadedUrls
      ].join('\n');

      this.entryForm.patchValue({
        photosRaw: newVal
      });
    }

  } catch (err) {
    console.error(err);
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
      const dataUrl = await this.readFile(input.files[0]);
      this.dataService.updateProfile(this.profile().name, dataUrl);
    } catch (err) {
      console.error('Avatar upload failed', err);
    } finally {
      this.processingFiles.set(false);
      input.value = '';
    }
  }

  onSeek(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.audioService.seek(Number(val));
  }

  onVolume(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.audioService.setVolume(Number(val));
  }

  formatTime(seconds: number): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async onMusicSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.processingFiles.set(true);
    try {
      const file = input.files[0];
      
      // Supported audio types validation
      const supportedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/mp4'];
      const isActuallySupported = supportedTypes.includes(file.type) || 
                                  file.name.toLowerCase().endsWith('.mp3') || 
                                  file.name.toLowerCase().endsWith('.m4a') ||
                                  file.name.toLowerCase().endsWith('.wav');

      if (!isActuallySupported) {
        alert('Formato não suportado. Por favor use MP3, M4A ou WAV.');
        return;
      }

      // Check if file is small enough (50MB limit for SQL/Express)
      if (file.size > 50 * 1024 * 1024) {
        alert('Arquivo muito grande (máximo 50MB).');
        return;
      }

      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
      this.dataService.updateProfile(this.profile().name, this.profile().avatarUrl, dataUrl);
      
      // Play immediately
      this.audioService.setVolume(0.02);
      this.audioService.setSourceAndPlay(dataUrl);

    } catch (err) {
      console.error('Music upload failed', err);
      alert('Failed to upload music. Check if the file is a valid audio format.');
    } finally {
      this.processingFiles.set(false);
      input.value = '';
    }
  }

  private readFile(file: File): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve('');
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension for storage optimization (increased for higher quality)
          const MAX_DIM = 3000;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG for space efficiency
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  addCategory(input: HTMLInputElement) {
    const val = input.value.trim();
    if (val) {
      console.log('Dashboard: Adding category:', val);
      this.dataService.addCategory(val);
      input.value = '';
    }
  }

  showDeleteConfirm = signal<string | null>(null);

  confirmDeleteCategory(event: MouseEvent, cat: {id: string, name: string}) {
    event.stopPropagation();
    this.showDeleteConfirm.set(cat.id);
  }

  cancelDelete(event: MouseEvent) {
    event.stopPropagation();
    this.showDeleteConfirm.set(null);
  }

  doDeleteCategory(event: MouseEvent, id: string) {
    event.stopPropagation();
    event.preventDefault();
    
    console.log('Dashboard: doDeleteCategory for:', id);
    this.dataService.deleteCategory(id);
    this.showDeleteConfirm.set(null);
  }

  resetAndShowForm() {
    this.editingId.set(null);
    this.entryForm.reset({ categoryId: 'all', title: '', credits: '', coverUrl: '', photosRaw: '' });
    this.showForm.set(true);
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  editEntry(entry: Entry) {
    this.editingId.set(entry.id);
    this.entryForm.patchValue({
      title: entry.title,
      credits: entry.credits,
      categoryId: entry.categoryId,
      coverUrl: entry.coverUrl,
      photosRaw: entry.photos.join('\n')
    });
    this.showForm.set(true);

    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  saveEntry() {
    if (this.entryForm.valid) {
      const formValue = this.entryForm.value;
      const entryData = {
        title: formValue.title!,
        credits: formValue.credits || '',
        categoryId: formValue.categoryId!,
        coverUrl: formValue.coverUrl!,
        photos: formValue.photosRaw?.split('\n').map(s => s.trim()).filter(s => !!s) || []
      };

      if (this.editingId()) {
        this.dataService.updateEntry(this.editingId()!, entryData);
      } else {
        this.dataService.addEntry(entryData);
      }

      this.cancelEdit();
    }
  }

  cancelEdit() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.entryForm.reset({ categoryId: 'all' });
  }

  checkPassword(pwd: string) {
    if (this.dataService.authorize(pwd)) {
      this.loginError.set(false);
      const url = this.profile().musicUrl;
      if (url) {
        this.audioService.setVolume(0.02);
        this.audioService.setSourceAndPlay(url);
      }
    } else {
      this.loginError.set(true);
      setTimeout(() => this.loginError.set(false), 3000);
    }
  }

  openPhotoManager(entry: Entry) {
    this.managingPhotos.set(entry);
  }

  closePhotoManager() {
    this.managingPhotos.set(null);
  }

  removePhoto(photoUrl: string) {
    const current = this.managingPhotos();
    if (!current) return;
    
    const updatedPhotos = current.photos.filter(p => p !== photoUrl);
    const updatedEntry = { ...current, photos: updatedPhotos };
    
    this.dataService.updateEntry(current.id, updatedEntry);
    this.managingPhotos.set(updatedEntry);
  }

  ngOnDestroy() {
    this.audioService.pause();
  }

  logout() {
    this.dataService.logout();
    this.audioService.pause();
  }
}
