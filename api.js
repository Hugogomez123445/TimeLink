const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());

// -----------------------------------------------
// Conectar DB (ruta actual)
// -----------------------------------------------
const db = new sqlite3.Database("./db/data.db", (err) => {
  if (err) console.error("❌ Error abriendo BD:", err.message);
  else console.log("✅ BD conectada");
});

// helpers
function qAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function qGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function qRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tablePage({ title, head, rowsHtml }) {
  return `
  <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)}</title>
      <style>
        body{font-family:Arial;background:#f0f3f9;padding:20px;}
        h1{color:#2563eb}
        .wrap{max-width:1100px;margin:0 auto;}
        table{width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;}
        th{background:#2563eb;color:white;padding:10px;text-align:left;}
        td{padding:10px;border-bottom:1px solid #e5e7eb;}
        tr:nth-child(even){background:#eef4ff;}
        img{width:70px;height:70px;object-fit:cover;border-radius:12px}
        .badge{padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;display:inline-block;}
        .b-res{background:#fee2e2;color:#991b1b;}
        .b-can{background:#e5e7eb;color:#374151;}
        .b-com{background:#dcfce7;color:#166534;}
      </style>
    </head>
    <body>
      <div class="wrap">
        <h1>${escapeHtml(title)}</h1>
        <table>
          <thead>${head}</thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </body>
  </html>`;
}

// ============================================================
//  ✅ CITAS (con joins reales)
//  GET /citas?json=1
// ============================================================
app.get("/citas", async (req, res) => {
  try {
    const sql = `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.nota,
        c.telefono,
        c.duracion_min,
        c.created_at,

        e.id AS empresa_id,
        e.nombre AS empresa_nombre,

        t.id AS trabajador_id,
        t.username AS trabajador_nombre,
        t.email AS trabajador_email,

        cl.id AS cliente_id,
        cl.nombre AS cliente_nombre,
        cl.email AS cliente_email
      FROM citas c
      LEFT JOIN empresas e ON e.id = c.empresa_id
      LEFT JOIN trabajadores t ON t.id = c.trabajador_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      ORDER BY c.fecha ASC, c.hora ASC
    `;

    const rows = await qAll(sql);

    if (req.query.json === "1") return res.json(rows);

    const head = `
      <tr>
        <th>ID</th>
        <th>Cliente</th>
        <th>Empresa</th>
        <th>Trabajador</th>
        <th>Fecha</th>
        <th>Hora</th>
        <th>Teléfono</th>
        <th>Estado</th>
        <th>Nota</th>
      </tr>`;

    const rowsHtml = rows.map(c => {
      const estado = (c.estado || "reservado").toLowerCase();
      const badge =
        estado === "cancelada" ? `<span class="badge b-can">cancelada</span>` :
        estado === "completada" ? `<span class="badge b-com">completada</span>` :
        `<span class="badge b-res">reservado</span>`;

      return `
        <tr>
          <td>${c.id}</td>
          <td>${escapeHtml(c.cliente_nombre || "—")}</td>
          <td>${escapeHtml(c.empresa_nombre || "—")}</td>
          <td>${escapeHtml(c.trabajador_nombre || "—")}</td>
          <td>${escapeHtml(c.fecha)}</td>
          <td>${escapeHtml(c.hora)}</td>
          <td>${escapeHtml(c.telefono || "")}</td>
          <td>${badge}</td>
          <td>${escapeHtml(c.nota || "")}</td>
        </tr>`;
    }).join("");

    res.send(tablePage({ title: "Listado de Citas", head, rowsHtml }));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error en DB: " + e.message);
  }
});

// ============================================================
//  ✅ EMPRESAS
//  GET /empresas?json=1
// ============================================================
app.get("/empresas", async (req, res) => {
  try {
    const rows = await qAll(`SELECT id, nombre, direccion, telefono, imagen, created_at FROM empresas ORDER BY id DESC`);

    if (req.query.json === "1") return res.json(rows);

    const head = `
      <tr>
        <th>ID</th>
        <th>Nombre</th>
        <th>Dirección</th>
        <th>Teléfono</th>
        <th>Imagen</th>
      </tr>`;

    const rowsHtml = rows.map(e => `
      <tr>
        <td>${e.id}</td>
        <td>${escapeHtml(e.nombre)}</td>
        <td>${escapeHtml(e.direccion || "")}</td>
        <td>${escapeHtml(e.telefono || "")}</td>
        <td>${e.imagen ? `<img src="${e.imagen}">` : ""}</td>
      </tr>
    `).join("");

    res.send(tablePage({ title: "Empresas", head, rowsHtml }));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error en DB: " + e.message);
  }
});

// ============================================================
//  ✅ TRABAJADORES (con empresa)
//  GET /trabajadores?json=1
// ============================================================
app.get("/trabajadores", async (req, res) => {
  try {
    const sql = `
      SELECT
        t.id,
        t.username,
        t.email,
        t.imagen,
        t.empresa_id,
        e.nombre AS empresa_nombre
      FROM trabajadores t
      LEFT JOIN empresas e ON e.id = t.empresa_id
      ORDER BY t.id DESC
    `;
    const rows = await qAll(sql);

    if (req.query.json === "1") return res.json(rows);

    const head = `
      <tr>
        <th>ID</th>
        <th>Nombre</th>
        <th>Email</th>
        <th>Empresa</th>
        <th>Foto</th>
      </tr>`;

    const rowsHtml = rows.map(t => `
      <tr>
        <td>${t.id}</td>
        <td>${escapeHtml(t.username)}</td>
        <td>${escapeHtml(t.email || "")}</td>
        <td>${escapeHtml(t.empresa_nombre || "Sin asignar")}</td>
        <td>${t.imagen ? `<img style="border-radius:50%" src="${t.imagen}">` : ""}</td>
      </tr>
    `).join("");

    res.send(tablePage({ title: "Trabajadores", head, rowsHtml }));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error en DB: " + e.message);
  }
});

// ============================================================
//  ✅ CLIENTES (con empresa)
//  GET /clientes?json=1
// ============================================================
app.get("/clientes", async (req, res) => {
  try {
    const sql = `
      SELECT
        c.id,
        c.nombre,
        c.telefono,
        c.email,
        c.imagen,
        c.empresa_id,
        e.nombre AS empresa_nombre,
        c.created_at
      FROM clientes c
      LEFT JOIN empresas e ON e.id = c.empresa_id
      ORDER BY c.id DESC
    `;
    const rows = await qAll(sql);

    if (req.query.json === "1") return res.json(rows);

    const head = `
      <tr>
        <th>ID</th>
        <th>Nombre</th>
        <th>Email</th>
        <th>Teléfono</th>
        <th>Empresa</th>
        <th>Foto</th>
      </tr>`;

    const rowsHtml = rows.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${escapeHtml(c.nombre)}</td>
        <td>${escapeHtml(c.email || "")}</td>
        <td>${escapeHtml(c.telefono || "")}</td>
        <td>${escapeHtml(c.empresa_nombre || "—")}</td>
        <td>${c.imagen ? `<img src="${c.imagen}">` : ""}</td>
      </tr>
    `).join("");

    res.send(tablePage({ title: "Clientes", head, rowsHtml }));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error en DB: " + e.message);
  }
});

// ============================================================
//  ✅ ADMINS
//  GET /admins?json=1
// ============================================================
app.get("/admins", async (req, res) => {
  try {
    const rows = await qAll(`SELECT id, username, email, imagen, created_at FROM admins ORDER BY id DESC`);

    if (req.query.json === "1") return res.json(rows);

    const head = `
      <tr>
        <th>ID</th>
        <th>Usuario</th>
        <th>Email</th>
        <th>Foto</th>
      </tr>`;

    const rowsHtml = rows.map(a => `
      <tr>
        <td>${a.id}</td>
        <td>${escapeHtml(a.username)}</td>
        <td>${escapeHtml(a.email || "")}</td>
        <td>${a.imagen ? `<img style="border-radius:50%" src="${a.imagen}">` : ""}</td>
      </tr>
    `).join("");

    res.send(tablePage({ title: "Admins", head, rowsHtml }));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error en DB: " + e.message);
  }
});

// ============================================================
//  ✅ LOGIN (3 tablas) - opcional para pruebas
//  POST /login/admin | /login/trabajador | /login/cliente
// ============================================================
app.post("/login/admin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const row = await qGet(`SELECT id, username, email, imagen FROM admins WHERE username=? AND password=?`, [username, password]);
    if (!row) return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    res.json({ success: true, user: row, role: "admin" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/login/trabajador", async (req, res) => {
  try {
    const { username, password } = req.body;
    const row = await qGet(
      `SELECT id, username, email, imagen, empresa_id FROM trabajadores WHERE username=? AND password=?`,
      [username, password]
    );
    if (!row) return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    res.json({ success: true, user: row, role: "trabajador" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/login/cliente", async (req, res) => {
  try {
    const { username, password } = req.body;

    // OJO: tu tabla clientes NO tiene username/password en el último schema que pegaste.
    // Si quieres login real para clientes, añade esas columnas.
    // Mientras tanto, hacemos login por nombre+email como demo:
    const row = await qGet(
      `SELECT id, nombre, email, telefono, imagen FROM clientes WHERE nombre=? LIMIT 1`,
      [username]
    );
    if (!row) return res.status(401).json({ success: false, message: "Cliente no encontrado" });
    res.json({ success: true, user: row, role: "cliente" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============================================================
//  ✅ REGISTRO CLIENTE (si tu tabla clientes NO tiene username/password)
//  POST /register/cliente
// ============================================================
app.post("/register/cliente", async (req, res) => {
  try {
    const { nombre, email = "", telefono = "", empresa_id = null } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ success: false, message: "Nombre obligatorio" });
    }

    const r = await qRun(
      `INSERT INTO clientes (nombre, email, telefono, empresa_id) VALUES (?, ?, ?, ?)`,
      [String(nombre).trim(), String(email).trim(), String(telefono).trim(), empresa_id]
    );

    res.json({ success: true, id: r.lastID });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============================================================
//  🚀 INICIAR SERVIDOR
// ============================================================
app.listen(3000, () => {
  console.log("API disponible en http://localhost:3000");
});
