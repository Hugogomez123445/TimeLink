import { initHeaderAndPermissions, initAdminSubmenuToggle } from "./auth-ui.js";
import { loadSidebarAvatar } from "./helpers/dom.js";
import { state } from "./state.js";
import { navigate } from "./navigation/navigation.js";
import { logout } from "./navigation/logout.js";
import { cargarInicioAdmin, cargarInicioBasico, cargarInicioCliente } from "./pages/home.js";

window.navigate = navigate;
window.logout = logout;

async function init() {
  initHeaderAndPermissions();
  loadSidebarAvatar();
  initAdminSubmenuToggle();

  await navigate("inicio");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { init(); });
} else {
  init();
}
