import { state } from "../state.js";
import { cargarInicioAdmin, cargarInicioBasico, cargarInicioCliente, cargarInicioTrabajador } from "../pages/home.js";
import { seleccionarEmpresa, abrirCalendarioTrabajadorActual } from "../pages/calendar.js";
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

export async function navigate(section) {
  const main = document.getElementById("mainContent");
  setActiveButton(section);

  try {
    switch (section) {
      case "inicio":
        if (state.role === "admin") cargarInicioAdmin();
        else if (state.role === "trabajador") cargarInicioTrabajador();
        else if (state.role === "cliente") cargarInicioCliente();
        else cargarInicioBasico();
        break;


      case "calendario":
        if (String(state.role).toLowerCase() === "trabajador" || String(state.role).toLowerCase() === "trabajadores") {
          abrirCalendarioTrabajadorActual(main);
        } else {
          seleccionarEmpresa(main);
        }
        break;

      case "clientes":
        await renderClientes(main);
        break;

      case "citas":
        await renderCitas(main);
        break;

      case "ajustes":
        await renderAjustes(main);
        break;

      case "empresas":
        await renderEmpresas(main);
        break;

      case "trabajadores":
        await renderTrabajadores(main);
        break;

      default:
        // fallback
        if (state.role === "admin") await cargarInicioAdmin();
        else if (state.role === "cliente") await cargarInicioCliente();
        else await cargarInicioBasico();
        break;
    }
  } catch (err) {
    console.error("❌ Error en navigate():", err);
    if (main) {
      main.innerHTML = `
        <h1>Ups…</h1>
        <p>Ha ocurrido un error cargando esta sección.</p>
      `;
    }
  }
}
