import { initHeaderAndPermissions, initAdminSubmenuToggle } from "./auth-ui.js";
import { loadSidebarAvatar } from "./helpers/dom.js";
import { state } from "./state.js";
import { navigate } from "./navigation/navigation.js";
import { logout } from "./navigation/logout.js";
import { cargarInicioAdmin, cargarInicioBasico } from "./pages/home.js";

// Exponer para onclick del HTML
window.navigate = navigate;
window.logout = logout;

function init() {
  initHeaderAndPermissions();
  loadSidebarAvatar();
  initAdminSubmenuToggle();

  // carga inicial
  if (state.role === "admin") cargarInicioAdmin();
  else cargarInicioBasico();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
