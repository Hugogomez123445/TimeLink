export const api = {
  getEmpresas: () => window.api.getEmpresas(),
  getTrabajadores: () => window.api.getTrabajadores(),
  getCitas: (mode = "ALL") => window.api.getCitas(mode),

  addCita: (p) => window.api.addCita(p),
  updateCita: (p) => window.api.updateCita(p),
  deleteCita: (id) => window.api.deleteCita(id),
  setCitaEstado: (p) => window.api.setCitaEstado(p),
  findCitaCancelada: (p) => window.api.findCitaCancelada(p),

  addEmpresa: (p) => window.api.addEmpresa(p),
  updateEmpresa: (p) => window.api.updateEmpresa(p),
  deleteEmpresa: (id) => window.api.deleteEmpresa(id),

  addTrabajador: (p) => window.api.addTrabajador(p),
  updateTrabajador: (p) => window.api.updateTrabajador(p),
  deleteTrabajador: (id) => window.api.deleteTrabajador(id),

  // opcionales
  getClientes: () => window.api.getClientes ? window.api.getClientes() : Promise.resolve([]),
  deleteCliente: (id) => window.api.deleteCliente(id),

  updateProfile: (p) => window.api.updateProfile(p),
  updatePassword: (p) => window.api.updatePassword(p),

  getCitasTrabajador: (p) => window.api.getCitasTrabajador(p),

  getVacaciones: (p) => window.api.getVacaciones(p),
addVacacionesRango: (p) => window.api.addVacacionesRango(p),
deleteVacacion: (p) => window.api.deleteVacacion(p),

};
