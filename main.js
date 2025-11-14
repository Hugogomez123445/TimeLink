const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./db/database");

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, "assets/icon/Icono APP.icns"),
    webPreferences: {
      preload: path.join(__dirname, "renderer/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "renderer/index.html"));
}

// ======================
// USUARIOS
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

ipcMain.handle("register-user", (event, { username, email, password }) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            resolve({ success: false, message: "El usuario ya existe." });
          } else reject(err);
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

// ======================
// CITAS (Calendario)
// ======================

// Obtener citas
ipcMain.handle("get-citas", () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM citas", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// Añadir cita
ipcMain.handle("add-cita", (event, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO citas (fecha, hora, cliente) VALUES (?, ?, ?)",
      [data.fecha, data.hora, data.cliente],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true, id: this.lastID });
      }
    );
  });
});

// Eliminar cita
ipcMain.handle("delete-cita", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM citas WHERE id = ?",
      [id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

// ======================
// INICIO APP
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
