const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "data.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Error abriendo BD:", err);
});

// Helpers ------------------------------------------------
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function ensureColumn(table, column, definition) {
  const cols = await all(`PRAGMA table_info(${table})`);
  const names = cols.map((c) => c.name);
  if (!names.includes(column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Init ---------------------------------------------------
db.serialize(async () => {
  try {
    await run("PRAGMA foreign_keys = ON");

    // ======================================================
    //   EMPRESAS
    // ======================================================
    await run(`
      CREATE TABLE IF NOT EXISTS empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        direccion TEXT,
        telefono TEXT,
        imagen TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // ======================================================
    //   USERS (empleados / admin)
    // ======================================================
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'empleado', -- admin | empleado
        imagen TEXT,
        empresa_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
      )
    `);

    // Por si tu BD ya existía con menos columnas:
    await ensureColumn("users", "email", "TEXT");
    await ensureColumn("users", "role", "TEXT NOT NULL DEFAULT 'empleado'");
    await ensureColumn("users", "imagen", "TEXT");
    await ensureColumn("users", "empresa_id", "INTEGER");
    await ensureColumn("users", "created_at", "TEXT DEFAULT (datetime('now'))");

    // ======================================================
    //   CLIENTES (nuevo)
    // ======================================================
    await run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        telefono TEXT,
        email TEXT,
        nota TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      )
    `);

    // ======================================================
    //   CITAS (normalizado)
    // ======================================================
    await run(`
      CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER NOT NULL,
        trabajador_id INTEGER,          -- user.id
        cliente_id INTEGER,             -- clientes.id (puede ser null si reservas rápida)
        fecha TEXT NOT NULL,            -- YYYY-MM-DD
        hora TEXT NOT NULL,             -- HH:MM
        duracion_min INTEGER DEFAULT 30,
        estado TEXT NOT NULL DEFAULT 'reservado', -- reservado | cancelado
        nota TEXT,
        created_at TEXT DEFAULT (datetime('now')),

        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        FOREIGN KEY (trabajador_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
      )
    `);

    // Si tu tabla citas venía de antes, añadimos columnas sin romper
    await ensureColumn("citas", "empresa_id", "INTEGER");
    await ensureColumn("citas", "trabajador_id", "INTEGER");
    await ensureColumn("citas", "cliente_id", "INTEGER");
    await ensureColumn("citas", "duracion_min", "INTEGER DEFAULT 30");
    await ensureColumn("citas", "estado", "TEXT NOT NULL DEFAULT 'reservado'");
    await ensureColumn("citas", "nota", "TEXT");
    await ensureColumn("citas", "created_at", "TEXT DEFAULT (datetime('now'))");

    // ======================================================
    //   ÍNDICES (rendimiento)
    // ======================================================
    await run(`CREATE INDEX IF NOT EXISTS idx_users_empresa ON users(empresa_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_citas_empresa_fecha ON citas(empresa_id, fecha)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_citas_trabajador ON citas(trabajador_id)`);

    // ======================================================
    //   REGLA: no doble reserva
    //   (misma empresa + trabajador + fecha + hora)
    // ======================================================
    await run(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_citas_slot
      ON citas(empresa_id, trabajador_id, fecha, hora)
    `);

    console.log("✅ Base de datos conectada");
  } catch (e) {
    console.error("❌ Error inicializando BD:", e);
  }
});

module.exports = db;
