const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./db/database");
const fs = require("fs");


// CREAR VENTANA
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "renderer/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "renderer/index.html"));
}
// ======================
// LOGIN / REGISTRO (3 TABLAS)
// ======================

// ---- LOGIN ADMIN ----
ipcMain.handle("login-admin", (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM admins WHERE username = ? AND password = ?",
      [username, password],
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve({ success: true, user: row });
        resolve({ success: false, message: "Administrador o contraseña incorrectos." });
      }
    );
  });
});

// ---- LOGIN TRABAJADOR ----
ipcMain.handle("login-trabajador", (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM trabajadores WHERE username = ? AND password = ?",
      [username, password],
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve({ success: true, user: row });
        resolve({ success: false, message: "Trabajador o contraseña incorrectos." });
      }
    );
  });
});


// ---- LOGIN CLIENTE ----
ipcMain.handle("login-cliente", (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM clientes WHERE username = ? AND password = ?",
      [username, password],
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve({ success: true, user: row });
        resolve({ success: false, message: "Usuario o contraseña incorrectos." });
      }
    );
  });
});

// ---- REGISTRO CLIENTE ----
ipcMain.handle("register-cliente", (event, { username, email, password, nombre }) => {
  return new Promise((resolve, reject) => {
    const nombreFinal = (nombre && nombre.trim()) ? nombre.trim() : username;

    db.run(
      `INSERT INTO clientes (username, email, password, nombre)
       VALUES (?, ?, ?, ?)`,
      [username, email, password, nombreFinal],
      function (err) {
        if (err) {
          if (String(err.message).includes("UNIQUE"))
            return resolve({ success: false, message: "El usuario ya existe." });
          return reject(err);
        }
        resolve({ success: true, id: this.lastID });
      }
    );
  });
});



// ======================
// CITAS (SEGURAS PARA TRABAJADOR)
// ======================
ipcMain.handle("get-citas-trabajador", async (event, { trabajador_id }) => {
  return new Promise((resolve, reject) => {
    if (!trabajador_id) return resolve([]);

    // 1) Sacar empresa del trabajador (para evitar que el renderer la “invente”)
    db.get(
      `SELECT empresa_id FROM trabajadores WHERE id = ?`,
      [trabajador_id],
      (err, tr) => {
        if (err) return reject(err);
        if (!tr || !tr.empresa_id) return resolve([]);

        const empresa_id = tr.empresa_id;

        // 2) Traer SOLO citas de esa empresa + ese trabajador
        const sql = `
          SELECT 
            c.id,
            c.fecha,
            c.hora,
            c.estado,
            c.nota,
            c.empresa_id,
            c.trabajador_id,
            c.created_at,
            c.updated_at,
            cl.nombre AS cliente,
            COALESCE(c.telefono, cl.telefono) AS telefono
          FROM citas c
          LEFT JOIN clientes cl ON cl.id = c.cliente_id
          WHERE c.trabajador_id = ?
            AND c.empresa_id = ?
          ORDER BY COALESCE(c.updated_at, c.created_at) DESC
        `;

        db.all(sql, [trabajador_id, empresa_id], (e2, rows) => {
          if (e2) return reject(e2);
          resolve(rows || []);
        });
      }
    );
  });
});



// ======================
// CITAS
// ======================
ipcMain.handle("get-citas", async () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.nota,
        c.empresa_id,
        c.trabajador_id,
        c.created_at,
        c.updated_at,
        cl.nombre AS cliente,
        cl.telefono AS telefono
      FROM citas c
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      ORDER BY COALESCE(c.updated_at, c.created_at) DESC
    `;
    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
});


ipcMain.handle("add-cita", async (event, payload) => {
  const {
    fecha,
    hora,
    cliente,          // nombre escrito
    telefono = "",
    nota = "",
    empresa_id,
    trabajador_id
  } = payload;

  return new Promise((resolve, reject) => {
    if (!empresa_id || !trabajador_id || !fecha || !hora) {
      return resolve({
        success: false,
        message: "Faltan datos obligatorios."
      });
    }

    // 1️⃣ Buscar cliente EXISTENTE (solo para enlazar)
    const findClient = `
      SELECT id FROM clientes
      WHERE nombre = ?
      LIMIT 1
    `;

    db.get(findClient, [cliente?.trim() || ""], (err, row) => {
      if (err) return reject(err);

      // 👉 si existe, usamos su id
      // 👉 si NO existe, cliente_id = NULL
      const cliente_id = row?.id ?? null;

      // 2️⃣ Insertar cita SIEMPRE
      const insertCita = `
        INSERT INTO citas (
          empresa_id,
          trabajador_id,
          cliente_id,
          fecha,
          hora,
          duracion_min,
          estado,
          nota,
          telefono
        )
        VALUES (?, ?, ?, ?, ?, 30, 'reservado', ?, ?)
      `;

      db.run(
        insertCita,
        [
          empresa_id,
          trabajador_id,
          cliente_id,
          fecha,
          hora,
          nota,
          telefono
        ],
        function (e2) {
          if (e2) {
            // ⛔ slot ocupado
            if (String(e2.message).includes("UNIQUE constraint failed")) {
              return resolve({
                success: false,
                message: "Esa hora ya está reservada."
              });
            }
            return reject(e2);
          }

          resolve({
            success: true,
            id: this.lastID,
            cliente_id
          });
        }
      );
    });
  });
});



ipcMain.handle("delete-cita", async (event, citaId) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM citas WHERE id = ?`, [citaId], function (err) {
      if (err) return reject(err);
      resolve({ success: true, changes: this.changes });
    });
  });
});


// ======================
// ADMIN: USUARIOS
// ======================

ipcMain.handle("get-all-users", () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle("update-user-role", (event, { id, role }) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

ipcMain.handle("delete-user", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

// =======================================
// EMPRESAS
// =======================================

// Añadir empresa
ipcMain.handle("add-empresa", async (event, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO empresas (nombre, direccion, telefono, imagen)
       VALUES (?, ?, ?, ?)`,
      [data.nombre, data.direccion, data.telefono, data.imagen],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true, id: this.lastID });
      }
    );
  });
});


// Obtener todas las empresas
ipcMain.handle("get-empresas", () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM empresas`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

ipcMain.handle("update-empresa", async (event, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE empresas 
       SET nombre = ?, direccion = ?, telefono = ?, imagen = ?
       WHERE id = ?`,
      [data.nombre, data.direccion, data.telefono, data.imagen, data.id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

ipcMain.handle("delete-empresa", async (event, id) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM empresas WHERE id = ?", [id], function (err) {
            if (err) reject(err);
            else resolve(true);
        });
    });
});

ipcMain.handle("save-image", async (evt, { fileName, data }) => {
    try {
        const savePath = path.join(__dirname, "uploads");

        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath);
        }

        const finalPath = path.join(savePath, Date.now() + "_" + fileName);

        fs.writeFileSync(finalPath, data);

        return finalPath;
    } catch (err) {
        console.error("Error guardando imagen:", err);
        return null;
    }
});



// =======================================
// TRABAJADORES
// =======================================

ipcMain.handle("get-trabajadores", () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
          t.id,
          t.username,
          t.email,
          t.imagen,
          t.empresa_id,
          (SELECT nombre FROM empresas WHERE empresas.id = t.empresa_id) AS empresaNombre
        FROM trabajadores t
      `,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
});

ipcMain.handle("add-trabajador", (e, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO trabajadores (username, email, password, empresa_id, imagen)
       VALUES (?, ?, ?, ?, ?)`,
      [data.username, data.email, data.password, data.empresa_id, data.imagen],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
});

ipcMain.handle("update-trabajador", (e, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE trabajadores 
       SET username=?, email=?, empresa_id=?, imagen=?
       WHERE id=?`,
      [data.username, data.email, data.empresa_id, data.imagen, data.id],
      function (err) {
        if (err) return reject(err);
        resolve(true);
      }
    );
  });
});

ipcMain.handle("delete-trabajador", (e, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM trabajadores WHERE id=?`, [id], err => {
      if (err) return reject(err);
      resolve(true);
    });
  });
});



// Buscar si existe una cita cancelada en ese hueco (para reusar y evitar UNIQUE)
ipcMain.handle("find-cita-cancelada", async (event, { empresa_id, trabajador_id, fecha, hora }) => {
  return new Promise((resolve, reject) => {
    const q = `
      SELECT id
      FROM citas
      WHERE empresa_id = ?
        AND trabajador_id = ?
        AND fecha = ?
        AND hora = ?
        AND estado = 'cancelada'
      LIMIT 1
    `;
    db.get(q, [empresa_id, trabajador_id, fecha, hora], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
});

// Cambiar estado de cita
ipcMain.handle("set-cita-estado", async (event, { id, estado }) => {
  return new Promise((resolve, reject) => {
    const q = `UPDATE citas SET estado = ?, updated_at = datetime('now') WHERE id = ?`;
    db.run(q, [estado, id], function (err) {
      if (err) return reject(err);
      resolve({ success: true, changes: this.changes });
    });
  });
});






ipcMain.handle("get-clientes", async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM clientes", [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
});


// ======================
// PERFIL: actualizar nombre/email/imagen (según rol)
// ======================
ipcMain.handle("update-profile", async (event, { role, id, username, email, nombre, imagen }) => {
  return new Promise((resolve, reject) => {
    if (!role || !id) return resolve({ success: false, message: "Faltan datos" });

    // Normalizamos campos
    const u = (username ?? "").trim();
    const e = (email ?? "").trim();
    const n = (nombre ?? "").trim();
    const img = imagen ?? null;

    if (role === "admin") {
      // admins: username/email/imagen
      db.run(
        `UPDATE admins SET username = COALESCE(?, username),
                           email = COALESCE(?, email),
                           imagen = COALESCE(?, imagen)
         WHERE id = ?`,
        [u || null, e || null, img, id],
        function (err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        }
      );
      return;
    }

    if (role === "trabajador") {
      // trabajadores: username/email/imagen
      db.run(
        `UPDATE trabajadores SET username = COALESCE(?, username),
                                 email = COALESCE(?, email),
                                 imagen = COALESCE(?, imagen)
         WHERE id = ?`,
        [u || null, e || null, img, id],
        function (err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        }
      );
      return;
    }

    if (role === "cliente") {
      // clientes: nombre/email/imagen (ojo: tu tabla clientes NO tiene username)
      // Si en tu UI usas "username" para cliente, lo guardamos como "nombre"
      const nombreFinal = n || u; // si viene username, lo usamos como nombre
      db.run(
        `UPDATE clientes SET nombre = COALESCE(?, nombre),
                             email = COALESCE(?, email),
                             imagen = COALESCE(?, imagen)
         WHERE id = ?`,
        [nombreFinal || null, e || null, img, id],
        function (err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        }
      );
      return;
    }

    resolve({ success: false, message: "Rol no válido" });
  });
});

// ======================
// PERFIL: cambiar contraseña (según rol)
// ======================
ipcMain.handle("update-password", async (event, { role, id, oldPassword, newPassword }) => {
  return new Promise((resolve, reject) => {
    if (!role || !id) return resolve({ success: false, message: "Faltan datos." });
    if (!oldPassword || !newPassword) return resolve({ success: false, message: "Completa todos los campos." });

    const oldP = String(oldPassword);
    const newP = String(newPassword);

    // tabla según rol
    const table =
      role === "admin" ? "admins" :
      role === "trabajador" ? "trabajadores" :
      role === "cliente" ? "clientes" :
      null;

    if (!table) return resolve({ success: false, message: "Rol no válido." });

    // 1) comprobar contraseña actual
    db.get(
      `SELECT id FROM ${table} WHERE id = ? AND password = ?`,
      [id, oldP],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve({ success: false, message: "La contraseña actual no es correcta." });

        // 2) actualizar
        db.run(
          `UPDATE ${table} SET password = ? WHERE id = ?`,
          [newP, id],
          function (err2) {
            if (err2) return reject(err2);
            resolve({ success: true, changes: this.changes });
          }
        );
      }
    );
  });
});


// ======================
// INICIAR APP
// ======================

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
