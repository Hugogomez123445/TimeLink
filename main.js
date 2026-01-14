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
// LOGIN
// ======================

ipcMain.handle("login-user", (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password],
      (err, row) => {
        if (err) reject(err);
        if (row) resolve({ success: true, user: row });
        else resolve({ success: false, message: "Usuario o contraseña incorrectos." });
      }
    );
  });
});

// ======================
// REGISTRO
// ======================

ipcMain.handle("register-user", (event, { username, email, password }) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed"))
            resolve({ success: false, message: "El usuario ya existe." });
          else reject(err);
        } else resolve({ success: true });
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
        cl.nombre AS cliente,
        cl.telefono AS telefono
      FROM citas c
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      ORDER BY c.fecha ASC, c.hora ASC
    `;
    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
});

ipcMain.handle("add-cita", async (event, payload) => {
  const { fecha, hora, cliente, telefono = "", nota = "", empresa_id = null, trabajador_id = null } = payload;

  return new Promise((resolve, reject) => {
    // 1) Buscar cliente (por empresa + nombre + telefono)
    const findClient = `
      SELECT id FROM clientes 
      WHERE empresa_id = ? AND nombre = ? AND IFNULL(telefono,'') = IFNULL(?, '')
      LIMIT 1
    `;

    db.get(findClient, [empresa_id, cliente, telefono], (err, row) => {
      if (err) return reject(err);

      const insertCita = (cliente_id) => {
        const insert = `
          INSERT INTO citas (empresa_id, trabajador_id, cliente_id, fecha, hora, duracion_min, estado, nota)
          VALUES (?, ?, ?, ?, ?, 30, 'reservado', ?)
        `;
        db.run(insert, [empresa_id, trabajador_id, cliente_id, fecha, hora, nota], function (e2) {
          if (e2) return reject(e2);
          resolve({ success: true, id: this.lastID });
        });
      };

      if (row?.id) {
        insertCita(row.id);
      } else {
        // 2) Crear cliente
        const createClient = `
          INSERT INTO clientes (empresa_id, nombre, telefono)
          VALUES (?, ?, ?)
        `;
        db.run(createClient, [empresa_id, cliente, telefono], function (e3) {
          if (e3) return reject(e3);
          insertCita(this.lastID);
        });
      }
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
          users.id,
          users.username,
          users.email,
          users.imagen,
          users.empresa_id,
          (SELECT nombre FROM empresas WHERE empresas.id = users.empresa_id) AS empresaNombre
        FROM users 
        WHERE role='trabajador'
      `,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});


ipcMain.handle("add-trabajador", (e, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (username, email, password, role, empresa_id, imagen)
       VALUES (?, ?, ?, 'trabajador', ?, ?)`,
      [data.username, data.email, data.password, data.empresa_id, data.imagen],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
});


ipcMain.handle("update-trabajador", (e, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users 
       SET username=?, email=?, empresa_id=?, imagen=?
       WHERE id=?`,
      [data.username, data.email, data.empresa_id, data.imagen, data.id],
      function (err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
});


ipcMain.handle("delete-trabajador", (e, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM users WHERE id=?`, [id], err => {
      if (err) reject(err);
      else resolve(true);
    });
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
