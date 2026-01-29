const db = require("../db/database");

module.exports = (ipcMain) => {
  ipcMain.handle("update-profile", async (event, { role, id, username, email, nombre, imagen }) => {
    return new Promise((resolve, reject) => {
      if (!role || !id) return resolve({ success: false, message: "Faltan datos" });

      const u = (username ?? "").trim();
      const e = (email ?? "").trim();
      const n = (nombre ?? "").trim();
      const img = imagen ?? null;

      if (role === "admin") {
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
        const nombreFinal = n || u;
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

  ipcMain.handle("update-password", async (event, { role, id, oldPassword, newPassword }) => {
    return new Promise((resolve, reject) => {
      if (!role || !id) return resolve({ success: false, message: "Faltan datos." });
      if (!oldPassword || !newPassword) return resolve({ success: false, message: "Completa todos los campos." });

      const table =
        role === "admin" ? "admins" :
        role === "trabajador" ? "trabajadores" :
        role === "cliente" ? "clientes" :
        null;

      if (!table) return resolve({ success: false, message: "Rol no válido." });

      db.get(
        `SELECT id FROM ${table} WHERE id = ? AND password = ?`,
        [id, String(oldPassword)],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve({ success: false, message: "La contraseña actual no es correcta." });

          db.run(
            `UPDATE ${table} SET password = ? WHERE id = ?`,
            [String(newPassword), id],
            function (err2) {
              if (err2) return reject(err2);
              resolve({ success: true, changes: this.changes });
            }
          );
        }
      );
    });
  });
};
