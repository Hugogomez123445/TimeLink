import { state } from "./state.js";

export function initHeaderAndPermissions() {
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  if (userName) userName.textContent = state.username;
  if (userEmail) userEmail.textContent = state.email;

  const btnCalendario = document.getElementById("btnCalendario");
  const btnClientes = document.getElementById("btnClientes");
  const btnCitas = document.getElementById("btnCitas");
  const btnEmpresas = document.getElementById("btnEmpresas");
  const btnTrabajadores = document.getElementById("btnTrabajadores");
  const submenuAdminContainer = document.getElementById("submenuAdminContainer");

  if (state.role === "cliente") {
    if (btnTrabajadores) btnTrabajadores.style.display = "none";
    if (btnEmpresas) btnEmpresas.style.display = "none";
    if (btnClientes) btnClientes.style.display = "none"
  }

  if (state.role === "trabajador") {
    if (btnTrabajadores) btnTrabajadores.style.display = "none";
    if (btnEmpresas) btnEmpresas.style.display = "none";
  }

  if (state.role === "admin") {
    if (btnCalendario) btnCalendario.style.display = "none";
    if (btnClientes) btnClientes.style.display = "none";
    if (btnCitas) btnCitas.style.display = "none";
  }

  if (submenuAdminContainer) {
    submenuAdminContainer.style.display = state.role === "admin" ? "block" : "none";
  }
}

export function initAdminSubmenuToggle() {
  const adminToggleBtn = document.getElementById("adminToggleBtn");
  const adminSubmenu = document.getElementById("adminSubmenu");
  if (!adminToggleBtn || !adminSubmenu) return;

  adminToggleBtn.addEventListener("click", () => {
    const visible = adminSubmenu.style.display === "flex";
    adminSubmenu.style.display = visible ? "none" : "flex";
    adminToggleBtn.textContent = visible
      ? "⚙️ Administración avanzada ▾"
      : "⚙️ Administración avanzada ▴";
  });
}
