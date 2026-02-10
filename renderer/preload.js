const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // LOGIN / REGISTRO NUEVO
  loginAdmin: (data) => ipcRenderer.invoke("login-admin", data),
  loginTrabajador: (data) => ipcRenderer.invoke("login-trabajador", data),
  loginCliente: (data) => ipcRenderer.invoke("login-cliente", data),
  registerCliente: (data) => ipcRenderer.invoke("register-cliente", data),

  // CITAS
  getCitas: () => ipcRenderer.invoke("get-citas"),
  addCita: (data) => ipcRenderer.invoke("add-cita", data),
  deleteCita: (id) => ipcRenderer.invoke("delete-cita", id),
  updateCita: (data) => ipcRenderer.invoke("update-cita", data),

  // EMPRESAS
  addEmpresa: (data) => ipcRenderer.invoke("add-empresa", data),
  getEmpresas: () => ipcRenderer.invoke("get-empresas"),
  updateEmpresa: (data) => ipcRenderer.invoke("update-empresa", data),
  deleteEmpresa: (id) => ipcRenderer.invoke("delete-empresa", id),
  saveImage: (data) => ipcRenderer.invoke("save-image", data),

  // TRABAJADORES
  getTrabajadores: () => ipcRenderer.invoke("get-trabajadores"),
  addTrabajador: (data) => ipcRenderer.invoke("add-trabajador", data),
  updateTrabajador: (data) => ipcRenderer.invoke("update-trabajador", data),
  deleteTrabajador: (id) => ipcRenderer.invoke("delete-trabajador", id),

  // CITAS extra
  findCitaCancelada: (data) => ipcRenderer.invoke("find-cita-cancelada", data),
  setCitaEstado: (data) => ipcRenderer.invoke("set-cita-estado", data),

  getClientes: () => ipcRenderer.invoke("get-clientes"),

  updateProfile: (data) => ipcRenderer.invoke("update-profile", data),
  updatePassword: (data) => ipcRenderer.invoke("update-password", data),

  getCitasTrabajador: (data) => ipcRenderer.invoke("get-citas-trabajador", data),

  // REGISTRO trabajador se queda en PENDIENTE
  registerTrabajador: (data) => ipcRenderer.invoke("register-trabajador", data),

  // aprobar trabajador
  aprobarTrabajador: (id) => ipcRenderer.invoke("aprobar-trabajador", id),

  // listado solo pendientes
  getTrabajadoresPendientes: () => ipcRenderer.invoke("get-trabajadores-pendientes"),


  getVacaciones: (p) => ipcRenderer.invoke("get-vacaciones", p),
addVacacionesRango: (p) => ipcRenderer.invoke("add-vacaciones-rango", p),
deleteVacacion: (p) => ipcRenderer.invoke("delete-vacacion", p),

});
