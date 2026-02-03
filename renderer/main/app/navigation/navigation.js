import { state } from "../state.js";
import { cargarInicioAdmin, cargarInicioBasico } from "../pages/home.js";
import { seleccionarEmpresa } from "../pages/calendar.js";
import { renderClientes } from "../pages/clientes.js";
import { renderCitas } from "../pages/citas.js";
import { renderAjustes } from "../pages/ajustes.js";
import { renderEmpresas } from "../pages/empresas.js";
import { renderTrabajadores } from "../pages/trabajadores.js";

export function setActiveButton(section) {
  const buttons = document.querySelectorAll(".menu button");
  buttons.forEach(btn => btn.classList.remove("active"));

  const map = {
    inicio: "btnInicio",
    calendario: "btnCalendario",
    clientes: "btnClientes",
    citas: "btnCitas",
    ajustes: "btnAjustes",
    empresas: "btnEmpresas",
    trabajadores: "btnTrabajadores",
  };

  const id = map[section];
  if (id) document.getElementById(id)?.classList.add("active");
}

export function navigate(section) {
  const main = document.getElementById("mainContent");
  setActiveButton(section);

  switch (section) {
    case "inicio":
      if (state.role === "admin") cargarInicioAdmin();
      else cargarInicioBasico();
      break;
    case "calendario":
      seleccionarEmpresa(main);
      break;
    case "clientes":
      renderClientes(main);
      break;
    case "citas":
      renderCitas(main);
      break;
    case "ajustes":
      renderAjustes(main);
      break;
    case "empresas":
      renderEmpresas(main);
      break;
    case "trabajadores":
      renderTrabajadores(main);
      break;
  }
}
