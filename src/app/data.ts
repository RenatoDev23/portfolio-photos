import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

export interface Category {
  id: string;
  name: string;
}
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://stnrdvhlevymguwkhdbm.supabase.co',
  'sb_publishable_gVxdcxvWLTRjJx8n4XGIpA_5syPheKX'
);

export interface Entry {
  id: string;
  title: string;
  credits: string;
  categoryId: string;
  coverUrl: string;
  photos: string[];
  createdAt?: string | Date;
}

export interface Profile {
  name: string;
  avatarUrl: string;
  musicUrl: string;
  isDarkMode: boolean;
  views: number;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private socket: Socket | null = null;
  
  isAuthorized = signal<boolean>(false);
  categories = signal<Category[]>([]);
  entries = signal<Entry[]>([]);
  deletingIds = signal<Set<string>>(new Set());
  dbStatus = signal<'checking' | 'connected' | 'error'>('checking');
  profile = signal<Profile>({
    name: 'RENATO SANTOS',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop',
    musicUrl: '',
    isDarkMode: false,
    views: 0
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const savedAuth = localStorage.getItem('admin_auth');
      if (savedAuth === 'true') {
        this.isAuthorized.set(true);
      }

      this.initData();
      this.initSocket();
      this.checkDbHealth();
    }
  }

  private checkDbHealth() {
    this.http.get<{status: string}>('/api/health').subscribe({
      next: (val) => {
        if (val.status === 'ok') this.dbStatus.set('connected');
        else this.dbStatus.set('error');
      },
      error: () => this.dbStatus.set('error')
    });
  }

  private initData() {
    this.http.get<Category[]>('/api/categories').subscribe(cats => this.categories.set(cats));
    this.http.get<Entry[]>('/api/entries').subscribe(ents => this.entries.set(ents));
    this.http.get<Profile>('/api/profile').subscribe(prof => this.profile.set(prof));
  }

  private initSocket() {
    this.socket = io();

    this.socket.on('category:added', (cat: Category) => {
      this.categories.update(cats => {
        if (cats.some(c => c.id === cat.id)) return cats;
        return [...cats, cat];
      });
    });

    this.socket.on('category:deleted', (id: string) => {
      this.categories.update(cats => cats.filter(c => c.id !== id));
    });

    this.socket.on('entry:added', (entry: Entry) => {
      this.entries.update(ents => [entry, ...ents]);
    });

    this.socket.on('entry:updated', (updated: Entry) => {
      this.entries.update(ents => ents.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    });

    this.socket.on('entry:deleted', (id: string) => {
      this.entries.update(ents => ents.filter(e => e.id !== id));
    });

    this.socket.on('profile:updated', (prof: Profile) => {
      this.profile.update(p => ({ ...p, ...prof }));
    });

    this.socket.on('profile:views', (views: number) => {
      this.profile.update(p => ({ ...p, views }));
    });
  }

  authorize(password: string): boolean {
    if (password === 'admin2026') {
      this.isAuthorized.set(true);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('admin_auth', 'true');
      }
      return true;
    }
    return false;
  }

  logout() {
    this.isAuthorized.set(false);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('admin_auth');
    }
  }

  addCategory(name: string) {
    this.http.post<Category>('/api/categories', { name }).subscribe({
      next: (cat) => {
        console.log('Category added successfully:', cat);
        this.categories.update(cats => {
          if (cats.some(c => c.id === cat.id)) return cats;
          return [...cats, cat];
        });
      },
      error: (err) => console.error('Error adding category:', err)
    });
  }

  deleteCategory(id: string) {
    console.log(`[DataService] deleteCategory called for id: ${id}`);
    this.deletingIds.update(s => {
      const next = new Set(s);
      next.add(id);
      return next;
    });

    this.http.delete(`/api/categories/${id}`).subscribe({
      next: (resp) => {
        console.log(`[DataService] Successfully deleted ${id} on server, response:`, resp);
        this.categories.update(cats => cats.filter(c => c.id !== id));
        this.stopDeleting(id);
      },
      error: (err) => {
        console.error(`[DataService] Failed to delete ${id}:`, err);
        alert('Erro ao excluir categoria. Verifique sua conexão.');
        this.stopDeleting(id);
      }
    });
  }

  private stopDeleting(id: string) {
    this.deletingIds.update(s => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  refreshCategories() {
    console.log('[DataService] Refreshing categories...');
    this.http.get<Category[]>('/api/categories').subscribe(cats => {
      console.log(`[DataService] Loaded ${cats.length} categories`);
      this.categories.set(cats);
    });
  }

  addEntry(entry: Omit<Entry, 'id'>) {
    this.http.post<Entry>('/api/entries', entry).subscribe({
      next: (newEntry) => {
        console.log('Entry added successfully:', newEntry.id);
        this.entries.update(ents => [newEntry, ...ents]);
      },
      error: (err) => {
        console.error('Error adding entry:', err);
        alert('Erro ao salvar nova entrada. Verifique o tamanho das imagens ou sua conexão.');
      }
    });
  }

  updateEntry(id: string, entry: Partial<Entry>) {
    this.http.patch<Entry>(`/api/entries/${id}`, entry).subscribe({
      next: (updated) => {
        console.log('Entry updated successfully:', id);
        this.entries.update(ents => ents.map(e => e.id === id ? { ...e, ...updated } : e));
      },
      error: (err) => {
        console.error('Error updating entry:', err);
        alert('Erro ao atualizar entrada.');
      }
    });
  }

  deleteEntry(id: string) {
    this.http.delete(`/api/entries/${id}`).subscribe({
      next: () => {
        console.log('Entry deleted successfully:', id);
        this.entries.update(ents => ents.filter(e => e.id !== id));
      },
      error: (err) => {
        console.error('Error deleting entry:', err);
        alert('Erro ao excluir entrada.');
      }
    });
  }

  getEntryById(id: string) {
    return computed(() => this.entries().find(e => e.id === id));
  }

  updateProfile(name: string, avatarUrl: string, musicUrl: string = this.profile().musicUrl, isDarkMode: boolean = this.profile().isDarkMode) {
    this.profile.update(p => ({ ...p, name, avatarUrl, musicUrl, isDarkMode }));
    this.http.post<Profile>('/api/profile', { name, avatarUrl, musicUrl, isDarkMode }).subscribe({
      error: () => this.initData()
    });
  }

  incrementViews() {
    this.http.post<{ views: number }>('/api/profile/increment-views', {}).subscribe();
  }
  async uploadImage(file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('portfolio')
      .upload(fileName, file);

    if (error) {
      console.error('Erro upload:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('portfolio')
      .getPublicUrl(fileName);

    console.log('URL DA IMAGEM:', publicUrlData.publicUrl);

    return publicUrlData.publicUrl;

  } catch (err) {
    console.error(err);
    throw err;
  }
}
}
