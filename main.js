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

// Obtener citas
ipcMain.handle("get-citas", (event, userId) => {
  return new Promise((resolve, reject) => {
    // Admin ve todo
    if (userId === "ALL") {
      db.all("SELECT * FROM citas", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else {
      // Cliente solo sus citas
      db.all(
        "SELECT * FROM citas WHERE userId = ?",
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    }
  });
});

// Añadir cita
ipcMain.handle("add-cita", (event, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO citas 
      (fecha, hora, cliente, telefono, nota, estado, userId, username)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.fecha,
        data.hora,
        data.cliente,
        data.telefono,
        data.nota,
        data.estado,
        data.userId,
        data.username,
      ],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true, id: this.lastID });
      }
    );
  });
});

// Editar cita
ipcMain.handle("update-cita", (event, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE citas SET
      fecha = ?, hora = ?, cliente = ?, telefono = ?, nota = ?, estado = ?
      WHERE id = ?
    `,
      [
        data.fecha,
        data.hora,
        data.cliente,
        data.telefono,
        data.nota,
        data.estado,
        data.id,
      ],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

// Eliminar cita
ipcMain.handle("delete-cita", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM citas WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
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
