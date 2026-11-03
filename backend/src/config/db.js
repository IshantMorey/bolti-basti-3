const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// On Vercel, the filesystem is read-only except for /tmp
const dbDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bolti_basti.db');
const db = new DatabaseSync(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    original_transcript TEXT,
    language TEXT NOT NULL,
    locality TEXT,
    landmark TEXT,
    duration TEXT,
    urgency TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Pending',
    audio_confirmation_base64 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_complaints_ticket_id ON complaints(ticket_id);
  CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
  CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
`);

module.exports = db;
