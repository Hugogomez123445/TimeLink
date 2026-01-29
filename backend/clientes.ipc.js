const db = require("../db/database");

module.exports = (ipcMain) => {
  ipcMain.handle("get-clientes", async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM clientes", [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  });
};
