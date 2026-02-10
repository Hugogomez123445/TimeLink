const db = require("../db/database");

module.exports = (ipcMain) => {
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
        if (!row) return resolve({ success: false, message: "Trabajador o contraseña incorrectos." });

        if ((row.estado || "pendiente") !== "aprobado") {
          return resolve({ success: false, message: "Tu cuenta está pendiente de aprobación por un administrador." });
        }

        resolve({ success: true, user: row });
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
};
