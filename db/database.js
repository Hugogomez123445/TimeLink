const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "data.db");
const db = new sqlite3.Database(dbPath);

// =======================================
//   TABLA USUARIOS
// =======================================

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT,
    password TEXT,
    role TEXT DEFAULT 'cliente'
  )
`);

// AÑADIR COLUMNA ROLE SI LA TABLA YA EXISTÍA
db.all("PRAGMA table_info(users)", (err, rows) => {
  if (err) return console.error("Error leyendo tabla users:", err);

  const columns = rows.map(r => r.name);

  if (!columns.includes("role")) {
    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'cliente'");
    console.log("✔ Columna 'role' añadida a users");
  }
});

// =======================================
//   TABLA CITAS
// =======================================

db.run(`
  CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    cliente TEXT,
    telefono TEXT,
    nota TEXT,
    estado TEXT DEFAULT 'reservado',
    userId INTEGER,
    username TEXT
  )
`);

module.exports = db;
