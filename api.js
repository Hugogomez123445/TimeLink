const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(express.json());

// -----------------------------------------------
// DB 
// -----------------------------------------------
const dbPath = path.join(__dirname, "db", "data.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error abriendo BD:", err.message);
  else console.log("BD conectada:", dbPath);
});

// Helpers SQL
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

// HTML helpers
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
        .b-pend{background:#fef3c7;color:#92400e;}
        .b-apr{background:#dcfce7;color:#166534;}
        .muted{color:#6b7280;font-size:12px}
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

// -----------------------------------------------
// VALIDACIONES
// -----------------------------------------------
function onlyDigits9(phone) {
  const p = String(phone || "").replace(/\D/g, "");
  return /^\d{9}$/.test(p) ? p : null;
}
function requireStr(v) {
  const s = String(v || "").trim();
  return s.length ? s : null;
}

// ============================================================
// AUTH
// ============================================================

// ADMIN
app.post("/login/admin", async (req, res) => {
  try {
    const username = requireStr(req.body.username);
    const password = requireStr(req.body.password);
    if (!username || !password) return res.status(400).json({ success: false, message: "Faltan campos" });

    const row = await qGet(
      `SELECT id, username, email, imagen FROM admins WHERE username=? AND password=?`,
      [username, password]
    );

    if (!row) return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    res.json({ success: true, user: row, role: "admin" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// TRABAJADOR APROBADO
app.post("/login/trabajador", async (req, res) => {
  try {
    const username = requireStr(req.body.username);
    const password = requireStr(req.body.password);
    if (!username || !password) return res.status(400).json({ success: false, message: "Faltan campos" });

    const row = await qGet(
      `SELECT id, username, email, imagen, empresa_id, estado
       FROM trabajadores WHERE username=? AND password=?`,
      [username, password]
    );

    if (!row) return res.status(401).json({ success: false, message: "Credenciales incorrectas" });

    if (String(row.estado || "pendiente").toLowerCase() !== "aprobado") {
      return res.status(403).json({ success: false, message: "Tu cuenta está pendiente de aprobación por un administrador." });
    }

    res.json({ success: true, user: row, role: "trabajador" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// CLIENTE
app.post("/login/cliente", async (req, res) => {
  try {
    const username = requireStr(req.body.username);
    const password = requireStr(req.body.password);
    if (!username || !password) return res.status(400).json({ success: false, message: "Faltan campos" });

    const row = await qGet(
      `SELECT id, username, email, imagen
       FROM clientes WHERE username=? AND password=?`,
      [username, password]
    );

    if (!row) return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    res.json({ success: true, user: row, role: "cliente" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Registro CLIENTE
app.post("/register/cliente", async (req, res) => {
  try {
    const username = requireStr(req.body.username);
    const email = requireStr(req.body.email) || "";
    const password = requireStr(req.body.password);

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Usuario y contraseña obligatorios" });
    }

    try {
      const r = await qRun(
        `INSERT INTO clientes (username, email, password, imagen) VALUES (?, ?, ?, ?)`,
        [username, email, password, req.body.imagen ?? null]
      );
      res.json({ success: true, id: r.lastID });
    } catch (e) {
      // UNIQUE username
      return res.json({ success: false, message: "No se pudo registrar (¿usuario ya existe?)." });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Registro TRABAJADOR PENDIENTE
app.post("/register/trabajador", async (req, res) => {
  try {
    const username = requireStr(req.body.username);
    const email = requireStr(req.body.email) || "";
    const password = requireStr(req.body.password);
    const empresa_id = req.body.empresa_id ?? null;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Usuario y contraseña obligatorios" });
    }

    try {
      const r = await qRun(
        `INSERT INTO trabajadores (username, email, password, empresa_id, imagen, estado)
         VALUES (?, ?, ?, ?, ?, 'pendiente')`,
        [username, email, password, empresa_id, req.body.imagen ?? null]
      );
      res.json({ success: true, id: r.lastID });
    } catch (e) {
      return res.json({ success: false, message: "No se pudo registrar (¿usuario ya existe?)." });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============================================================
// EMPRESAS 
// ============================================================

app.get("/empresas", async (req, res) => {
  try {
    const rows = await qAll(`SELECT id, nombre, direccion, telefono, imagen, created_at FROM empresas ORDER BY id DESC`);
    if (req.query.json === "1") return res.json(rows);

    const head = `<tr><th>ID</th><th>Nombre</th><th>Dirección</th><th>Teléfono</th><th>Imagen</th></tr>`;
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
    res.status(500).send("Error en DB: " + e.message);
  }
});

app.post("/empresas", async (req, res) => {
  try {
    const nombre = requireStr(req.body.nombre);
    if (!nombre) return res.status(400).json({ success: false, message: "Nombre obligatorio" });

    const r = await qRun(
      `INSERT INTO empresas (nombre, direccion, telefono, imagen) VALUES (?, ?, ?, ?)`,
      [nombre, req.body.direccion ?? null, req.body.telefono ?? null, req.body.imagen ?? null]
    );
    res.json({ success: true, id: r.lastID });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============================================================
// TRABAJADORES
// ============================================================

// listar trabajadores (con estado)
app.get("/trabajadores", async (req, res) => {
  try {
    const sql = `
      SELECT
        t.id, t.username, t.email, t.imagen, t.empresa_id, t.estado, t.created_at,
        e.nombre AS empresa_nombre
      FROM trabajadores t
      LEFT JOIN empresas e ON e.id = t.empresa_id
      ORDER BY CASE WHEN t.estado='pendiente' THEN 0 ELSE 1 END, t.id DESC
    `;
    const rows = await qAll(sql);
    if (req.query.json === "1") return res.json(rows);

    const head = `<tr><th>ID</th><th>Nombre</th><th>Email</th><th>Empresa</th><th>Estado</th><th>Foto</th></tr>`;
    const rowsHtml = rows.map(t => {
      const est = String(t.estado || "pendiente").toLowerCase();
      const badge = est === "aprobado"
        ? `<span class="badge b-apr">aprobado</span>`
        : `<span class="badge b-pend">pendiente</span>`;
      return `
        <tr>
          <td>${t.id}</td>
          <td>${escapeHtml(t.username)}</td>
          <td>${escapeHtml(t.email || "")}</td>
          <td>${escapeHtml(t.empresa_nombre || "Sin asignar")}</td>
          <td>${badge}</td>
          <td>${t.imagen ? `<img style="border-radius:50%" src="${t.imagen}">` : ""}</td>
        </tr>
      `;
    }).join("");

    res.send(tablePage({ title: "Trabajadores", head, rowsHtml }));
  } catch (e) {
    res.status(500).send("Error en DB: " + e.message);
  }
});

// pendientes
app.get("/trabajadores/pendientes", async (req, res) => {
  try {
    const rows = await qAll(
      `SELECT id, username, email, imagen, empresa_id, estado, created_at
       FROM trabajadores WHERE estado='pendiente' ORDER BY id DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// aprobar
app.post("/trabajadores/:id/aprobar", async (req, res) => {
  try {
    const id = req.params.id;
    const r = await qRun(`UPDATE trabajadores SET estado='aprobado' WHERE id=?`, [id]);
    res.json({ success: true, changes: r.changes });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// crear trabajador como admin (directo aprobado)
app.post("/trabajadores", async (req, res) => {
  try {
    const username = requireStr(req.body.username);
    const email = requireStr(req.body.email) || "";
    const password = requireStr(req.body.password);
    const empresa_id = req.body.empresa_id ?? null;

    if (!username || !password) return res.status(400).json({ success: false, message: "Usuario y contraseña obligatorios" });

    const r = await qRun(
      `INSERT INTO trabajadores (username, email, password, empresa_id, imagen, estado)
       VALUES (?, ?, ?, ?, ?, 'aprobado')`,
      [username, email, password, empresa_id, req.body.imagen ?? null]
    );
    res.json({ success: true, id: r.lastID });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============================================================
// CLIENTES
// ============================================================

app.get("/clientes", async (req, res) => {
  try {
    const rows = await qAll(`SELECT id, username, email, imagen, created_at FROM clientes ORDER BY id DESC`);
    if (req.query.json === "1") return res.json(rows);

    const head = `<tr><th>ID</th><th>Usuario</th><th>Email</th><th>Foto</th><th>Creado</th></tr>`;
    const rowsHtml = rows.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${escapeHtml(c.username)}</td>
        <td>${escapeHtml(c.email || "")}</td>
        <td>${c.imagen ? `<img src="${c.imagen}">` : ""}</td>
        <td class="muted">${escapeHtml(c.created_at || "")}</td>
      </tr>
    `).join("");

    res.send(tablePage({ title: "Clientes", head, rowsHtml }));
  } catch (e) {
    res.status(500).send("Error en DB: " + e.message);
  }
});

// ============================================================
// CITAS 
// ============================================================

app.get("/citas", async (req, res) => {
  try {
    const where = [];
    const params = [];

    if (req.query.trabajador_id) { where.push("c.trabajador_id=?"); params.push(req.query.trabajador_id); }
    if (req.query.cliente_id) { where.push("c.cliente_id=?"); params.push(req.query.cliente_id); }
    if (req.query.empresa_id) { where.push("c.empresa_id=?"); params.push(req.query.empresa_id); }
    if (req.query.estado) { where.push("LOWER(c.estado)=LOWER(?)"); params.push(req.query.estado); }

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
        cl.username AS cliente_nombre,
        cl.email AS cliente_email

      FROM citas c
      LEFT JOIN empresas e ON e.id = c.empresa_id
      LEFT JOIN trabajadores t ON t.id = c.trabajador_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY c.fecha ASC, c.hora ASC
    `;

    const rows = await qAll(sql, params);

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

// Crear cita
app.post("/citas", async (req, res) => {
  try {
    const empresa_id = req.body.empresa_id;
    const trabajador_id = req.body.trabajador_id;
    const cliente_id = req.body.cliente_id ?? null;

    const fecha = requireStr(req.body.fecha);
    const hora = requireStr(req.body.hora);

    const cliente = requireStr(req.body.cliente); // nombre visible (aunque tengas cliente_id)
    const tel = onlyDigits9(req.body.telefono);
    const nota = String(req.body.nota ?? "").trim();
    const duracion_min = Number(req.body.duracion_min ?? 30);
    const estado = String(req.body.estado ?? "reservado").toLowerCase();

    if (!empresa_id || !trabajador_id || !fecha || !hora) {
      return res.status(400).json({ success: false, message: "Faltan datos (empresa/trabajador/fecha/hora)" });
    }
    if (!cliente) {
      return res.status(400).json({ success: false, message: "El nombre (cliente) es obligatorio" });
    }
    if (!tel) {
      return res.status(400).json({ success: false, message: "El teléfono debe tener exactamente 9 dígitos" });
    }

    const r = await qRun(
      `INSERT INTO citas (empresa_id, trabajador_id, cliente_id, fecha, hora, duracion_min, telefono, nota, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [empresa_id, trabajador_id, cliente_id, fecha, hora, duracion_min, tel, nota, estado]
    );

    res.json({ success: true, id: r.lastID });
  } catch (e) {
    // UNIQUE slot
    if (String(e.message || "").includes("UNIQUE")) {
      return res.status(409).json({ success: false, message: "Esa hora ya está reservada." });
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

// Actualizar cita 
app.put("/citas/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const fecha = requireStr(req.body.fecha);
    const hora = requireStr(req.body.hora);

    const tel = req.body.telefono != null ? onlyDigits9(req.body.telefono) : null;
    if (req.body.telefono != null && !tel) {
      return res.status(400).json({ success: false, message: "El teléfono debe tener exactamente 9 dígitos" });
    }

    const fields = [];
    const params = [];

    if (req.body.empresa_id != null) { fields.push("empresa_id=?"); params.push(req.body.empresa_id); }
    if (req.body.trabajador_id != null) { fields.push("trabajador_id=?"); params.push(req.body.trabajador_id); }
    if (req.body.cliente_id !== undefined) { fields.push("cliente_id=?"); params.push(req.body.cliente_id); }

    if (fecha) { fields.push("fecha=?"); params.push(fecha); }
    if (hora) { fields.push("hora=?"); params.push(hora); }

    if (tel != null) { fields.push("telefono=?"); params.push(tel); }
    if (req.body.nota != null) { fields.push("nota=?"); params.push(String(req.body.nota).trim()); }
    if (req.body.estado != null) { fields.push("estado=?"); params.push(String(req.body.estado).toLowerCase()); }
    if (req.body.duracion_min != null) { fields.push("duracion_min=?"); params.push(Number(req.body.duracion_min)); }

    if (!fields.length) return res.json({ success: true, changes: 0 });

    params.push(id);
    const r = await qRun(`UPDATE citas SET ${fields.join(", ")} WHERE id=?`, params);
    res.json({ success: true, changes: r.changes });
  } catch (e) {
    if (String(e.message || "").includes("UNIQUE")) {
      return res.status(409).json({ success: false, message: "Esa hora ya está reservada." });
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

// Cambiar estado
app.patch("/citas/:id/estado", async (req, res) => {
  try {
    const id = req.params.id;
    const estado = String(req.body.estado || "").toLowerCase();
    if (!["reservado", "cancelada", "completada"].includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado inválido" });
    }
    const r = await qRun(`UPDATE citas SET estado=? WHERE id=?`, [estado, id]);
    res.json({ success: true, changes: r.changes });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// borrar cita
app.delete("/citas/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const r = await qRun(`DELETE FROM citas WHERE id=?`, [id]);
    res.json({ success: true, changes: r.changes });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// citas de un trabajador 
app.get("/citas/trabajador/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await qAll(
      `SELECT * FROM citas WHERE trabajador_id=? ORDER BY fecha ASC, hora ASC`,
      [id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// citas de un cliente (rápido)
app.get("/citas/cliente/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await qAll(
      `SELECT * FROM citas WHERE cliente_id=? ORDER BY fecha ASC, hora ASC`,
      [id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============================================================
// INICIO
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API disponible en http://localhost:${PORT}`);
});
