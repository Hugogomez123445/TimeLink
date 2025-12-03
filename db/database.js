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

db.all("PRAGMA table_info(users)", (err, rows) => {
  if (err) return console.error("Error leyendo tabla users:", err);

  const cols = rows.map(r => r.name);

  if (!cols.includes("imagen")) {
    db.run("ALTER TABLE users ADD COLUMN imagen TEXT", (err) => {
      if (err) console.log("⚠ No se pudo añadir imagen:", err.message);
      else console.log("✔ Columna imagen añadida a users");
    });
  }

  if (!cols.includes("empresa_id")) {
    db.run("ALTER TABLE users ADD COLUMN empresa_id INTEGER", (err) => {
      if (err) console.log("⚠ No se pudo añadir empresa_id:", err.message);
      else console.log("✔ Columna empresa_id añadida a users");
    });
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

// =======================================
//   TABLA EMPRESAS
// =======================================

db.run(`
  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    imagen TEXT

  )
`);

db.all("PRAGMA table_info(empresas)", (err, rows) => {
    const cols = rows.map(r => r.name);

    if (!cols.includes("imagen")) {
        db.run("ALTER TABLE empresas ADD COLUMN imagen TEXT");
        console.log("✔ Columna imagen añadida a empresas");
    }
});



module.exports = db;
