const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // LOGIN Y REGISTRO
  loginUser: data => ipcRenderer.invoke("login-user", data),
  registerUser: data => ipcRenderer.invoke("register-user", data),

  // CITAS
  getCitas: userId => ipcRenderer.invoke("get-citas", userId),
  addCita: data => ipcRenderer.invoke("add-cita", data),
  updateCita: data => ipcRenderer.invoke("update-cita", data),
  deleteCita: id => ipcRenderer.invoke("delete-cita", id),

  // ADMIN – USUARIOS
  getAllUsers: () => ipcRenderer.invoke("get-all-users"),
  updateUserRole: data => ipcRenderer.invoke("update-user-role", data),
  deleteUser: id => ipcRenderer.invoke("delete-user", id)
});
