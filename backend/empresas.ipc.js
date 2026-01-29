const db = require("../db/database");
const path = require("path");
const fs = require("fs");

module.exports = (ipcMain) => {
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

  ipcMain.handle("get-empresas", () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM empresas`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle("update-empresa", async (event, data) => {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE empresas SET nombre=?, direccion=?, telefono=?, imagen=? WHERE id=?`,
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
      const savePath = path.join(__dirname, "..", "uploads");
      if (!fs.existsSync(savePath)) fs.mkdirSync(savePath);

      const finalPath = path.join(savePath, Date.now() + "_" + fileName);
      fs.writeFileSync(finalPath, data);

      return finalPath;
    } catch (err) {
      console.error("Error guardando imagen:", err);
      return null;
    }
  });
};
