// db/database.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "data.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error abriendo BD:", err);
  else console.log("BD abierta:", dbPath);
});

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  // EMPRESAS
  db.run(`
    CREATE TABLE IF NOT EXISTS empresas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      direccion TEXT,
      telefono TEXT,
      imagen TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ADMINS
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      imagen TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // TRABAJADORES
  db.run(`
    CREATE TABLE IF NOT EXISTS trabajadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      imagen TEXT,
      empresa_id INTEGER,
      estado TEXT DEFAULT 'pendiente',  -- pendiente | aprobado
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
    )
  `);

  db.all("PRAGMA table_info(trabajadores)", (err, rows) => {
  if (err) return;

  const cols = rows.map(r => r.name);

  if (!cols.includes("estado")) {
    db.run(`ALTER TABLE trabajadores ADD COLUMN estado TEXT DEFAULT 'pendiente'`);
    console.log("✔ estado añadido a trabajadores");
  }
});


  // CLIENTES
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      imagen TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // CITAS
  db.run(`
    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      trabajador_id INTEGER NOT NULL,
      cliente_id INTEGER,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      duracion_min INTEGER DEFAULT 30,
      telefono TEXT,
      nota TEXT,
      estado TEXT DEFAULT 'reservado',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (trabajador_id) REFERENCES trabajadores(id) ON DELETE CASCADE,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
    )
  `);

  // MIGRACIÓN updated_at
  db.all("PRAGMA table_info(citas)", (err, rows) => {
    if (err) return;
    const cols = rows.map(r => r.name);
    if (!cols.includes("updated_at")) {
      db.run("ALTER TABLE citas ADD COLUMN updated_at TEXT");
      console.log("✔ updated_at añadido a citas");
    }
  });

  // INDICES
  db.run(`CREATE INDEX IF NOT EXISTS idx_trabajadores_empresa ON trabajadores(empresa_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_citas_empresa_fecha ON citas(empresa_id, fecha)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_citas_trabajador_fecha ON citas(trabajador_id, fecha)`);

  // UNIQUE SLOT
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_citas_slot
    ON citas(empresa_id, trabajador_id, fecha, hora)
  `);

  console.log("Tablas y índices listos (admins / trabajadores / clientes / empresas / citas)");
});

module.exports = db;
