const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Login Y Registro
  loginUser: (data) => ipcRenderer.invoke("login-user", data),
  registerUser: (data) => ipcRenderer.invoke("register-user", data),

  // CITAS 
  getCitas: () => ipcRenderer.invoke("get-citas"),
  addCita: (data) => ipcRenderer.invoke("add-cita", data),
  deleteCita: (id) => ipcRenderer.invoke("delete-cita", id)
});
