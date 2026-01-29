const db = require("../db/database");

module.exports = (ipcMain) => {
  ipcMain.handle("get-trabajadores", () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          t.id, t.username, t.email, t.imagen, t.empresa_id,
          (SELECT nombre FROM empresas WHERE empresas.id = t.empresa_id) AS empresaNombre
        FROM trabajadores t`,
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
        `UPDATE trabajadores SET username=?, email=?, empresa_id=?, imagen=? WHERE id=?`,
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
};
