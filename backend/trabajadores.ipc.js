const db = require("../db/database");

module.exports = (ipcMain) => {

  // =========================
  // LISTAR TRABAJADORES (incluye estado)
  // Pendientes primero
  // =========================

  ipcMain.handle("get-trabajadores", () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        t.id, t.username, t.email, t.imagen, t.empresa_id,
        t.estado,
        (SELECT nombre FROM empresas WHERE empresas.id = t.empresa_id) AS empresaNombre
      FROM trabajadores t
      ORDER BY 
        CASE WHEN t.estado='pendiente' THEN 0 ELSE 1 END,
        t.id DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
});


  // =========================
  // LISTAR SOLO PENDIENTES
  // =========================
 ipcMain.handle("get-trabajadores-pendientes", () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        t.id, t.username, t.email, t.imagen, t.empresa_id,
        t.estado,
        (SELECT nombre FROM empresas WHERE empresas.id = t.empresa_id) AS empresaNombre
      FROM trabajadores t
      WHERE t.estado='pendiente'
      ORDER BY t.id DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
});


  // =========================
  // ADD trabajador (admin crea trabajador directo -> aprobado)
  // =========================
ipcMain.handle("add-trabajador", (e, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO trabajadores (username, email, password, empresa_id, imagen, estado)
       VALUES (?, ?, ?, ?, ?, 'aprobado')`,
      [data.username, data.email, data.password, data.empresa_id, data.imagen],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
});


  // =========================
  // REGISTRO TRABAJADOR (PENDIENTE)
  // =========================
ipcMain.handle("register-trabajador", (e, data) => {
  return new Promise((resolve) => {
    db.run(
      `INSERT INTO trabajadores (username, email, password, empresa_id, imagen, estado)
       VALUES (?, ?, ?, ?, ?, 'pendiente')`,
      [data.username, data.email, data.password, data.empresa_id ?? null, data.imagen ?? null],
      function (err) {
        if (err) return resolve({ success: false, message: "No se pudo registrar (¿usuario/email ya existe?)." });
        resolve({ success: true, id: this.lastID });
      }
    );
  });
});


  // =========================
  // APROBAR TRABAJADOR (pendiente -> aprobado)
  // =========================
 ipcMain.handle("aprobar-trabajador", (e, { id }) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE trabajadores SET estado='aprobado' WHERE id=?`,
      [id],
      function (err) {
        if (err) return reject(err);
        resolve({ success: true });
      }
    );
  });
});



  // =========================
  // UPDATE trabajador
  // =========================
  ipcMain.handle("update-trabajador", (e, data) => {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE trabajadores
         SET username=?, email=?, empresa_id=?, imagen=?
         WHERE id=?`,
        [data.username, data.email, data.empresa_id ?? null, data.imagen ?? null, data.id],
        function (err) {
          if (err) return reject(err);
          resolve(true);
        }
      );
    });
  });

  // =========================
  // DELETE trabajador
  // =========================
  ipcMain.handle("delete-trabajador", (e, id) => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM trabajadores WHERE id=?`, [id], (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  });

};
