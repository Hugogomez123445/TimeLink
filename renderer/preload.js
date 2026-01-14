const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // LOGIN Y REGISTRO
  loginUser: (data) => ipcRenderer.invoke("login-user", data),
  registerUser: (data) => ipcRenderer.invoke("register-user", data),

  // CITAS
  getCitas: () => ipcRenderer.invoke("get-citas"),
  addCita: (data) => ipcRenderer.invoke("add-cita", data),
  deleteCita: (id) => ipcRenderer.invoke("delete-cita", id),



  updateCita: data => ipcRenderer.invoke("update-cita", data),

  // ADMIN – USUARIOS
  getAllUsers: () => ipcRenderer.invoke("get-all-users"),
  updateUserRole: data => ipcRenderer.invoke("update-user-role", data),
  deleteUser: id => ipcRenderer.invoke("delete-user", id),

  // EMPRESAS
  addEmpresa: data => ipcRenderer.invoke("add-empresa", data),
  getEmpresas: () => ipcRenderer.invoke("get-empresas"),
  updateEmpresa: data => ipcRenderer.invoke("update-empresa", data),
  deleteEmpresa: id => ipcRenderer.invoke("delete-empresa", id),



  // TRABAJADORES POR EMPRESA (FALTABA)
  getTrabajadoresByEmpresa: id => ipcRenderer.invoke("get-trabajadores-by-empresa", id),
  saveImage: data => ipcRenderer.invoke("save-image", data),

  getTrabajadores: () => ipcRenderer.invoke("get-trabajadores"),
  addTrabajador: (data) => ipcRenderer.invoke("add-trabajador", data),
  updateTrabajador: (data) => ipcRenderer.invoke("update-trabajador", data),
  deleteTrabajador: (id) => ipcRenderer.invoke("delete-trabajador", id),


});
