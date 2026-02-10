import { state, globals } from "../state.js";
import { api } from "../api.js";
import { fileToBase64, assetUrl } from "../helpers/dom.js";

let listenersBound = false;

export async function renderEmpresas(main) {
  if (state.role !== "admin") {
    main.innerHTML = "<h1>Acceso denegado</h1>";
    return;
  }

  globals.empresasGlobal = await api.getEmpresas();

  main.innerHTML = `
    <h1 class="title-page">EMPRESAS</h1>

    <div class="empresa-toolbar">
      <button class="btn-primary add-empresa-btn" id="btnNuevaEmpresa">
        Añadir empresa
      </button>

      <input id="buscarEmpresa"
        class="empresa-search"
        type="text"
        placeholder="🔍 Buscar empresa...">
    </div>

    <div id="empresaGrid" class="empresa-grid"></div>
  `;

  pintarEmpresas(globals.empresasGlobal);

  document.getElementById("buscarEmpresa").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    const filtradas = globals.empresasGlobal.filter(emp =>
      (emp.nombre || "").toLowerCase().includes(q)
    );
    pintarEmpresas(filtradas);
  };

  document.getElementById("btnNuevaEmpresa").onclick = () => nuevaEmpresa();

  bindEmpresaPopupListeners();
}

function pintarEmpresas(lista) {
  const grid = document.getElementById("empresaGrid");
  if (!grid) return;

  if (!lista || lista.length === 0) {
    grid.innerHTML = `<p class="empty-text">No hay empresas que coincidan con la búsqueda.</p>`;
    return;
  }

  const defaultCompany = assetUrl("default_company.png");

  grid.innerHTML = lista.map((e) => {
    const realIndex = globals.empresasGlobal.findIndex(x => String(x.id) === String(e.id));

    return `
      <div class="empresa-card-view" data-idx="${realIndex}">
        <img src="${e.imagen || defaultCompany}" class="empresa-img">
        <div class="empresa-info">
          <h3>${e.nombre}</h3>
          <p><b>Dirección:</b> ${e.direccion || "—"}</p>
          <p><b>Teléfono:</b> ${e.telefono || "—"}</p>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".empresa-card-view").forEach(card => {
    card.onclick = () => {
      const idx = Number(card.getAttribute("data-idx"));
      abrirEmpresa(idx);
    };
  });
}

function nuevaEmpresa() {
  globals.empresaIndex = null;
  globals.empresaActual = null;

  limpiarPopupEmpresa();

  const popup = document.getElementById("popupEmpresa");
  if (popup) popup.style.display = "flex";
}

function abrirEmpresa(index) {
  globals.empresaIndex = index;
  globals.empresaActual = globals.empresasGlobal[index];
  if (!globals.empresaActual) return;

  const defaultCompany = assetUrl("default_company.png");

  const img = document.getElementById("empresaViewImg");
  const nom = document.getElementById("empresaViewNombre");
  const dir = document.getElementById("empresaViewDireccion");
  const tel = document.getElementById("empresaViewTelefono");

  if (img) img.src = globals.empresaActual.imagen || defaultCompany;
  if (nom) nom.textContent = globals.empresaActual.nombre;
  if (dir) dir.textContent = "📍 " + (globals.empresaActual.direccion || "Sin dirección");
  if (tel) tel.textContent = "📞 " + (globals.empresaActual.telefono || "Sin teléfono");

  const popupView = document.getElementById("popupEmpresaView");
  if (popupView) popupView.style.display = "flex";
}

function limpiarPopupEmpresa() {
  const n = document.getElementById("empNombre");
  const d = document.getElementById("empDireccion");
  const t = document.getElementById("empTelefono");
  const i = document.getElementById("empImagen");

  if (n) n.value = "";
  if (d) d.value = "";
  if (t) t.value = "";
  if (i) i.value = "";
}

function bindEmpresaPopupListeners() {
  if (listenersBound) return;
  listenersBound = true;

  const cancelarEmpresaPopup = document.getElementById("cancelarEmpresaPopup");
  if (cancelarEmpresaPopup) {
    cancelarEmpresaPopup.onclick = () => {
      limpiarPopupEmpresa();
      document.getElementById("popupEmpresa").style.display = "none";
    };
  }

  const guardarEmpresaPopup = document.getElementById("guardarEmpresaPopup");
  if (guardarEmpresaPopup) {
    guardarEmpresaPopup.onclick = async () => {
      const nombre = document.getElementById("empNombre")?.value.trim() || "";
      const direccion = document.getElementById("empDireccion")?.value.trim() || "";
      const telefono = document.getElementById("empTelefono")?.value.trim() || "";
      const imgInput = document.getElementById("empImagen");

      if (!nombre) {
        alert("El nombre es obligatorio.");
        return;
      }

      let imagen =
        globals.empresaIndex !== null && globals.empresaIndex !== undefined
          ? globals.empresasGlobal[globals.empresaIndex]?.imagen || null
          : null;

      if (imgInput?.files?.length > 0) {
        imagen = await fileToBase64(imgInput.files[0]);
      }

      const esEdicion = globals.empresaIndex !== null && globals.empresaIndex !== undefined;

      try {
        if (esEdicion) {
          await api.updateEmpresa({
            id: globals.empresasGlobal[globals.empresaIndex].id,
            nombre,
            direccion,
            telefono,
            imagen
          });
        } else {
          await api.addEmpresa({ nombre, direccion, telefono, imagen });
        }

        limpiarPopupEmpresa();
        document.getElementById("popupEmpresa").style.display = "none";

        const main = document.getElementById("mainContent");
        if (main) await renderEmpresas(main);

      } catch (err) {
        console.error(err);
        alert("Error guardando la empresa. Mira consola (F12).");
      }
    };
  }

  const empresaViewClose = document.getElementById("empresaViewClose");
  if (empresaViewClose) {
    empresaViewClose.onclick = () => {
      document.getElementById("popupEmpresaView").style.display = "none";
    };
  }

  const empresaEditBtn = document.getElementById("empresaEditBtn");
  if (empresaEditBtn) {
    empresaEditBtn.onclick = () => {
      if (globals.empresaIndex === null || globals.empresaIndex === undefined) return;
      const e = globals.empresasGlobal[globals.empresaIndex];
      if (!e) return;

      document.getElementById("empNombre").value = e.nombre || "";
      document.getElementById("empDireccion").value = e.direccion || "";
      document.getElementById("empTelefono").value = e.telefono || "";
      document.getElementById("empImagen").value = "";

      document.getElementById("popupEmpresaView").style.display = "none";
      document.getElementById("popupEmpresa").style.display = "flex";
    };
  }

  const borrarEmpresaPreview = document.getElementById("borrarEmpresaPreview");
  if (borrarEmpresaPreview) {
    borrarEmpresaPreview.onclick = async () => {
      if (!globals.empresaActual) return;

      const confirmar = confirm(`¿Seguro que quieres eliminar "${globals.empresaActual.nombre}"?`);
      if (!confirmar) return;

      try {
        await api.deleteEmpresa(globals.empresaActual.id);

        globals.empresasGlobal = globals.empresasGlobal.filter(e => e.id !== globals.empresaActual.id);
        globals.empresaActual = null;
        globals.empresaIndex = null;

        document.getElementById("popupEmpresaView").style.display = "none";

        const grid = document.getElementById("empresaGrid");
        if (grid) pintarEmpresas(globals.empresasGlobal);

      } catch (err) {
        console.error(err);
        alert("Error eliminando la empresa. Mira consola (F12).");
      }
    };
  }
}
