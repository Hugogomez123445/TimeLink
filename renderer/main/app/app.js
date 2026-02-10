import { initHeaderAndPermissions, initAdminSubmenuToggle } from "./auth-ui.js";
import { loadSidebarAvatar } from "./helpers/dom.js";
import { state } from "./state.js";
import { navigate } from "./navigation/navigation.js";
import { logout } from "./navigation/logout.js";

// ✅ si lo sigues usando en algún sitio, lo puedes mantener,
// pero ya no hace falta llamarlo aquí
import { cargarInicioAdmin, cargarInicioBasico, cargarInicioCliente } from "./pages/home.js";

// Exponer para onclick del HTML
window.navigate = navigate;
window.logout = logout;

async function init() {
  initHeaderAndPermissions();
  loadSidebarAvatar();
  initAdminSubmenuToggle();

  // ✅ carga inicial SIEMPRE por router
  await navigate("inicio");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { init(); });
} else {
  init();
}
