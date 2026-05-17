import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json({ limit: '100mb' }));
const httpServer = createServer(app);
const io = new Server(httpServer, {
  maxHttpBufferSize: 1e8, // 100MB
  cors: {
    origin: '*',
  }
});

const db = new Database('data.db', { verbose: console.log });

// Optimizing SQL performance and persistence
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

interface Entry {
  id: string;
  title: string;
  credits: string;
  categoryId: string;
  coverUrl: string;
  photos: string[];
  createdAt?: string | Date;
}

interface Profile {
  name: string;
  avatarUrl: string;
  musicUrl: string;
  isDarkMode: boolean;
  views: number;
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  INSERT OR IGNORE INTO categories (id, name) VALUES ('all', 'ALL');

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    credits TEXT,
    categoryId TEXT NOT NULL,
    coverUrl TEXT NOT NULL,
    photos TEXT, -- JSON string array
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    avatarUrl TEXT,
    musicUrl TEXT,
    isDarkMode INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0
  );

  INSERT OR IGNORE INTO profile (id, name, avatarUrl, musicUrl, isDarkMode, views)
  VALUES (1, 'RENATO SANTOS', '', '', 0, 0);
`);

// API Endpoints
app.get('/api/health', (req, res) => {
  try {
    const tableCount = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
    res.json({ status: 'ok', tables: tableCount.count, database: 'sqlite' });
  } catch (err) {
    res.status(500).json({ error: 'DB_DISCONNECTED' });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const cats = db.prepare("SELECT * FROM categories ORDER BY (CASE WHEN id = 'all' THEN 0 ELSE 1 END), name ASC").all();
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name required' });
      return;
    }
    const id = Math.random().toString(36).substring(2, 11);
    db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(id, name);
    const newCat = { id, name };
    io.emit('category:added', newCat);
    res.json(newCat);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  const id = req.params['id'];
  console.log(`Server: Received DELETE request for category ${id}`);
  try {
    // Transaction-like: Update entries first to avoid broken links
    const entriesUpdate = db.prepare("UPDATE entries SET categoryId = 'all' WHERE categoryId = ?").run(id);
    console.log(`Server: Updated ${entriesUpdate.changes} entries for category ${id}`);
    
    const categoryDelete = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    console.log(`Server: Deleted ${categoryDelete.changes} category rows for ${id}`);
    
    if (categoryDelete.changes > 0) {
      io.emit('category:deleted', id);
      res.json({ success: true, id });
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (err) {
    console.error('Server: Deletion error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/entries', (req, res) => {
  const entries = db.prepare('SELECT * FROM entries ORDER BY createdAt DESC').all() as (Omit<Entry, 'photos'> & { photos: string })[];
  const formatted = entries.map((e) => ({
    ...e,
    photos: JSON.parse(e.photos || '[]')
  }));
  res.json(formatted);
});

app.post('/api/entries', (req, res) => {
  try {
    const { title, credits, categoryId, coverUrl, photos } = req.body;
    const id = Math.random().toString(36).substring(2, 11);
    
    console.log(`Server: Saving new entry: ${title} (${id})`);
    
    db.prepare('INSERT INTO entries (id, title, credits, categoryId, coverUrl, photos) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, title, credits, categoryId, coverUrl, JSON.stringify(photos || []));
    
    const newEntry = { id, title, credits, categoryId, coverUrl, photos: photos || [], createdAt: new Date() };
    io.emit('entry:added', newEntry);
    res.json(newEntry);
  } catch (err) {
    console.error('Server: Error adding entry:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/entries/:id', (req, res) => {
  try {
    const id = req.params['id'];
    const { title, credits, categoryId, coverUrl, photos } = req.body;
    
    console.log(`Server: Updating entry: ${id}`);
    
    const result = db.prepare('UPDATE entries SET title = ?, credits = ?, categoryId = ?, coverUrl = ?, photos = ? WHERE id = ?')
      .run(title, credits, categoryId, coverUrl, JSON.stringify(photos || []), id);
    
    if (result.changes > 0) {
      const updated = { id, title, credits, categoryId, coverUrl, photos };
      io.emit('entry:updated', updated);
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (err) {
    console.error('Server: Error updating entry:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/entries/:id', (req, res) => {
  try {
    const id = req.params['id'];
    console.log(`Server: Deleting entry: ${id}`);
    
    const result = db.prepare('DELETE FROM entries WHERE id = ?').run(id);
    
    if (result.changes > 0) {
      io.emit('entry:deleted', id);
      res.json({ success: true, id });
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (err) {
    console.error('Server: Error deleting entry:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/profile', (req, res) => {
  const prof = db.prepare('SELECT * FROM profile WHERE id = 1').get() as Profile;
  res.json({
    ...prof,
    isDarkMode: !!prof.isDarkMode
  });
});

app.post('/api/profile', (req, res) => {
  const { name, avatarUrl, musicUrl, isDarkMode } = req.body;
  db.prepare('UPDATE profile SET name = ?, avatarUrl = ?, musicUrl = ?, isDarkMode = ? WHERE id = 1')
    .run(name, avatarUrl, musicUrl, isDarkMode ? 1 : 0);
  
  const updated = { name, avatarUrl, musicUrl, isDarkMode };
  io.emit('profile:updated', updated);
  res.json(updated);
});

app.post('/api/profile/increment-views', (req, res) => {
  db.prepare('UPDATE profile SET views = views + 1 WHERE id = 1').run();
  const views = (db.prepare('SELECT views FROM profile WHERE id = 1').get() as { views: number }).views;
  io.emit('profile:views', views);
  res.json({ views });
});

const angularApp = new AngularNodeAppEngine();

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  // Direct API requests should not be handled by Angular
  if (req.url.startsWith('/api')) {
    return next();
  }

  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 3000;
  httpServer.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
