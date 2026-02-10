const db = require("../../db/database");

module.exports = (ipcMain) => {

  // ✅ listar vacaciones de un trabajador
  ipcMain.handle("get-vacaciones", (e, { trabajador_id }) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, trabajador_id, fecha, created_at
         FROM vacaciones
         WHERE trabajador_id = ?
         ORDER BY fecha ASC`,
        [trabajador_id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  });

  // ✅ añadir rango de vacaciones (fechaInicio..fechaFin inclusive)
  // - respeta límite de 30 días
  // - cancela automáticamente las citas reservadas en esas fechas
  ipcMain.handle("add-vacaciones-rango", (e, { trabajador_id, fechaInicio, fechaFin }) => {
    return new Promise((resolve, reject) => {
      if (!trabajador_id || !fechaInicio || !fechaFin) {
        return resolve({ success: false, message: "Faltan datos." });
      }

      // generar lista de fechas YYYY-MM-DD
      function datesBetween(a, b) {
        const out = [];
        const start = new Date(a + "T00:00:00");
        const end = new Date(b + "T00:00:00");
        if (isNaN(start) || isNaN(end) || start > end) return out;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          out.push(d.toISOString().slice(0, 10));
        }
        return out;
      }

      const fechas = datesBetween(fechaInicio, fechaFin);
      if (fechas.length === 0) return resolve({ success: false, message: "Rango inválido." });

      db.serialize(() => {
        // 1) contar días actuales
        db.get(
          `SELECT COUNT(*) AS total FROM vacaciones WHERE trabajador_id = ?`,
          [trabajador_id],
          (err, row) => {
            if (err) return reject(err);

            const yaTiene = Number(row?.total || 0);

            // 2) contar cuántas nuevas serían (excluyendo duplicadas)
            db.all(
              `SELECT fecha FROM vacaciones WHERE trabajador_id = ? AND fecha IN (${fechas.map(() => "?").join(",")})`,
              [trabajador_id, ...fechas],
              (err2, existentes) => {
                if (err2) return reject(err2);

                const setExist = new Set((existentes || []).map(x => x.fecha));
                const nuevas = fechas.filter(f => !setExist.has(f));

                if (yaTiene + nuevas.length > 30) {
                  return resolve({
                    success: false,
                    message: `No puedes superar 30 días. Te quedan ${Math.max(0, 30 - yaTiene)} días.`
                  });
                }

                // 3) insertar nuevas (en transacción)
                db.run("BEGIN TRANSACTION");
                let ok = true;

                const insertStmt = db.prepare(
                  `INSERT OR IGNORE INTO vacaciones (trabajador_id, fecha) VALUES (?, ?)`
                );

                for (const f of nuevas) {
                  insertStmt.run([trabajador_id, f], (e3) => {
                    if (e3) ok = false;
                  });
                }

                insertStmt.finalize(async () => {
                  if (!ok) {
                    db.run("ROLLBACK");
                    return resolve({ success: false, message: "Error insertando vacaciones." });
                  }

                  // 4) cancelar citas reservadas en esas fechas
                  db.run(
                    `UPDATE citas
                     SET estado='cancelada', updated_at=datetime('now')
                     WHERE trabajador_id = ?
                       AND fecha IN (${fechas.map(() => "?").join(",")})
                       AND (estado IS NULL OR estado='reservado')`,
                    [trabajador_id, ...fechas],
                    (e4) => {
                      if (e4) {
                        db.run("ROLLBACK");
                        return resolve({ success: false, message: "Error cancelando citas." });
                      }

                      db.run("COMMIT");
                      resolve({
                        success: true,
                        added: nuevas.length,
                        canceledDates: fechas.length
                      });
                    }
                  );
                });
              }
            );
          }
        );
      });
    });
  });

  // eliminar un día de vacaciones
  ipcMain.handle("delete-vacacion", (e, { id }) => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM vacaciones WHERE id=?`, [id], (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  });
};
