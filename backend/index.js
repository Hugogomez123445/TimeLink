const { ipcMain } = require("electron");

require("./auth.ipc")(ipcMain);
require("./citas.ipc")(ipcMain);
require("./empresas.ipc")(ipcMain);
require("./trabajadores.ipc")(ipcMain);
require("./clientes.ipc")(ipcMain);
require("./perfil.ipc")(ipcMain);
require("./handlers/vacaciones")(ipcMain);

