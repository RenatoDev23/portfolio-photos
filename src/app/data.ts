import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://stnrdvhlevymguwkhdbm.supabase.co',
  'sb_publishable_gVxdcxvWLTRjJx8n4XGIpA_5syPheKX'
);

export interface Category { id: string; name: string; }
export interface Entry {
  id: string; title: string; credits: string;
  categoryId: string; coverUrl: string; photos: string[];
}
export interface Profile {
  name: string; avatarUrl: string; musicUrl: string;
  isDarkMode: boolean; views: number;
}

const DEFAULT_PROFILE: Profile = {
  name: 'RENATO SANTOS',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop',
  musicUrl: '', isDarkMode: false, views: 0
};

@Injectable({ providedIn: 'root' })
export class DataService {
  private platformId = inject(PLATFORM_ID);

  isAuthorized  = signal(false);
  categories    = signal<Category[]>([]);
  entries       = signal<Entry[]>([]);
  deletingIds   = signal<Set<string>>(new Set());
  dbStatus      = signal<'checking' | 'connected' | 'error'>('checking');
  profile       = signal<Profile>(DEFAULT_PROFILE);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('admin_auth');
      if (saved === 'true') this.isAuthorized.set(true);
      this.initData();
      this.initRealtime();
    }
  }

  private async initData() {
    try {
      const [cats, ents, prof] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('entries').select('*').order('id', { ascending: false }),
        supabase.from('profile').select('*').limit(1).single()
      ]);

      if (cats.data) this.categories.set(cats.data.map(this.mapCategory));
      if (ents.data) this.entries.set(ents.data.map(this.mapEntry));
      if (prof.data) this.profile.set(this.mapProfile(prof.data));

      this.dbStatus.set('connected');
    } catch {
      this.dbStatus.set('error');
    }
  }

  private initRealtime() {
    supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        supabase.from('categories').select('*').order('name').then(({ data }) => {
          if (data) this.categories.set(data.map(this.mapCategory));
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, () => {
        supabase.from('entries').select('*').order('id', { ascending: false }).then(({ data }) => {
          if (data) this.entries.set(data.map(this.mapEntry));
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile' }, () => {
        supabase.from('profile').select('*').eq('id', 1).single().then(({ data }) => {
          if (data) this.profile.set(this.mapProfile(data));
        });
      })
      .subscribe();
  }

  // Mappers: snake_case → camelCase
  private mapCategory(c: any): Category {
    return { id: c.id, name: c.name };
  }

  private mapEntry(e: any): Entry {
    return {
      id: e.id, title: e.title, credits: e.credits || '',
      categoryId: e.category_id, coverUrl: e.cover_url,
      photos: e.photos || []
    };
  }

  private mapProfile(p: any): Profile {
    return {
      name: p.name, avatarUrl: p.avatar_url || '',
      musicUrl: p.music_url || '', isDarkMode: p.is_dark_mode || false,
      views: p.views || 0
    };
  }

  authorize(password: string): boolean {
    if (password === 'admin2026') {
      this.isAuthorized.set(true);
      localStorage.setItem('admin_auth', 'true');
      return true;
    }
    return false;
  }

  logout() {
    this.isAuthorized.set(false);
    localStorage.removeItem('admin_auth');
  }

  async addCategory(name: string) {
    const id = Math.random().toString(36).substring(2, 11);
    const { error } = await supabase.from('categories').insert({ id, name });
    if (error) { alert('Erro ao adicionar categoria.'); console.error(error); }
  }

  async deleteCategory(id: string) {
    this.deletingIds.update(s => new Set([...s, id]));
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { alert('Erro ao excluir categoria.'); console.error(error); }
    this.deletingIds.update(s => { const n = new Set(s); n.delete(id); return n; });
  }

  refreshCategories() {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      if (data) this.categories.set(data.map(this.mapCategory));
    });
  }

  async addEntry(entry: Omit<Entry, 'id'>) {
    const { error } = await supabase.from('entries').insert({
      title: entry.title, credits: entry.credits,
      category_id: entry.categoryId, cover_url: entry.coverUrl,
      photos: entry.photos
    });
    if (error) { alert('Erro ao salvar entrada.'); console.error(error); }
  }

  async updateEntry(id: string, entry: Partial<Entry>) {
    const patch: any = {};
    if (entry.title !== undefined) patch.title = entry.title;
    if (entry.credits !== undefined) patch.credits = entry.credits;
    if (entry.categoryId !== undefined) patch.category_id = entry.categoryId;
    if (entry.coverUrl !== undefined) patch.cover_url = entry.coverUrl;
    if (entry.photos !== undefined) patch.photos = entry.photos;

    const { error } = await supabase.from('entries').update(patch).eq('id', id);
    if (error) { alert('Erro ao atualizar entrada.'); console.error(error); }
  }

  async deleteEntry(id: string) {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) { alert('Erro ao excluir entrada.'); console.error(error); }
  }

  getEntryById(id: string) {
    return computed(() => this.entries().find(e => e.id === id));
  }

  async updateProfile(patch: Partial<Profile>) {
    const current = this.profile();
    const updated = { ...current, ...patch };
    this.profile.set(updated);

    const { error } = await supabase.from('profile').upsert({
      id: 1,
      name: updated.name,
      avatar_url: updated.avatarUrl,
      music_url: updated.musicUrl,
      is_dark_mode: updated.isDarkMode,
      views: updated.views
    });
    if (error) console.error('Erro ao atualizar perfil:', error);
  }

  async incrementViews() {
    await supabase.rpc('increment_views');
  }

  async uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await supabase.storage.from('portfolio').upload(fileName, file);
    if (error) { console.error('Erro upload:', error); throw error; }
    const { data } = supabase.storage.from('portfolio').getPublicUrl(fileName);
    return data.publicUrl;
  }
}