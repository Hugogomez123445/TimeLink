const db = require("../db/database");

module.exports = (ipcMain) => {

  //CITAS SEGURAS TRABAJADOR 
  ipcMain.handle("get-citas-trabajador", async (event, { trabajador_id }) => {
    return new Promise((resolve, reject) => {
      if (!trabajador_id) return resolve([]);

      db.get(
        `SELECT empresa_id FROM trabajadores WHERE id = ?`,
        [trabajador_id],
        (err, tr) => {
          if (err) return reject(err);
          if (!tr || !tr.empresa_id) return resolve([]);

          const empresa_id = tr.empresa_id;

          const sql = `
            SELECT 
              c.id, c.fecha, c.hora, c.estado, c.nota,
              c.empresa_id, c.trabajador_id,
              c.created_at, c.updated_at,
              cl.nombre AS cliente,
              COALESCE(c.telefono, cl.telefono) AS telefono
            FROM citas c
            LEFT JOIN clientes cl ON cl.id = c.cliente_id
            WHERE c.trabajador_id = ? AND c.empresa_id = ?
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

  // TODAS LAS CITAS (admin)
  ipcMain.handle("get-citas", async () => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          c.id, c.fecha, c.hora, c.estado, c.nota,
          c.empresa_id, c.trabajador_id,
          c.created_at, c.updated_at,
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

  // AÑADIR CITA 
  ipcMain.handle("add-cita", async (event, payload) => {
    const { fecha, hora, cliente, telefono = "", nota = "", empresa_id, trabajador_id } = payload;

    return new Promise((resolve, reject) => {
      if (!empresa_id || !trabajador_id || !fecha || !hora) {
        return resolve({ success: false, message: "Faltan datos obligatorios." });
      }

      const findClient = `
        SELECT id FROM clientes
        WHERE nombre = ?
        LIMIT 1
      `;

      db.get(findClient, [cliente?.trim() || ""], (err, row) => {
        if (err) return reject(err);

        const cliente_id = row?.id ?? null;

        const insertCita = `
          INSERT INTO citas (
            empresa_id, trabajador_id, cliente_id,
            fecha, hora, duracion_min, estado, nota, telefono
          )
          VALUES (?, ?, ?, ?, ?, 30, 'reservado', ?, ?)
        `;

        db.run(insertCita, [empresa_id, trabajador_id, cliente_id, fecha, hora, nota, telefono], function (e2) {
          if (e2) {
            if (String(e2.message).includes("UNIQUE constraint failed")) {
              return resolve({ success: false, message: "Esa hora ya está reservada." });
            }
            return reject(e2);
          }

          resolve({ success: true, id: this.lastID, cliente_id });
        });
      });
    });
  });

  // BORRAR CITA 
  ipcMain.handle("delete-cita", async (event, citaId) => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM citas WHERE id = ?`, [citaId], function (err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
      });
    });
  });

  // REUSAR CANCELADA 
  ipcMain.handle("find-cita-cancelada", async (event, { empresa_id, trabajador_id, fecha, hora }) => {
    return new Promise((resolve, reject) => {
      const q = `
        SELECT id
        FROM citas
        WHERE empresa_id = ? AND trabajador_id = ? AND fecha = ? AND hora = ?
          AND estado = 'cancelada'
        LIMIT 1
      `;
      db.get(q, [empresa_id, trabajador_id, fecha, hora], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  });

  // CAMBIAR ESTADO 
  ipcMain.handle("set-cita-estado", async (event, { id, estado }) => {
    return new Promise((resolve, reject) => {
      const q = `UPDATE citas SET estado = ?, updated_at = datetime('now') WHERE id = ?`;
      db.run(q, [estado, id], function (err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
      });
    });
  });

};
