import { state, globals } from "../state.js";
import { api } from "../api.js";
import { fileToBase64, getAvatarHTML } from "../helpers/dom.js";

export async function renderTrabajadores(main) {
    if (state.role !== "admin") {
        main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
        return;
    }

    const trabajadores = await api.getTrabajadores();
    const empresas = await api.getEmpresas();

    globals.trabajadoresGlobal = trabajadores;
    globals.empresasGlobalList = empresas;

    const pendientes = trabajadores.filter(t => (t.estado || "pendiente") !== "aprobado");

    const aprobados = trabajadores.filter(t => (t.estado || "pendiente") === "aprobado");


    main.innerHTML = `
    <h1 class="title-page">TRABAJADORES</h1>

    <div class="trabajador-toolbar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
      <button class="btn-primary add-empresa-btn" id="btnNuevoTrabajador">
        Añadir trabajador
      </button>

      <input 
        type="text"
        id="buscarTrabajador"
        class="empresa-search"
        placeholder="🔎 Buscar trabajador..."
      >
    </div>

    <div style="margin-top:20px;">
      <h2>Trabajadores aprobados</h2><br>
      <div id="trabajadorGridAprobados" class="empresa-grid"></div>
    </div>

        <div style="margin-top:14px;">
      <h2 style="display:flex; align-items:center; gap:10px;">
        Pendientes de aprobación 
        <span style="background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:999px;font-size:12px;"><br>
          ${pendientes.length}
        </span>
      </h2>
      <div id="trabajadorGridPendientes" class="empresa-grid"></div>
    </div>
  `;

    pintarTrabajadores(pendientes, "trabajadorGridPendientes", true);
    pintarTrabajadores(aprobados, "trabajadorGridAprobados", false);

    document.getElementById("buscarTrabajador").oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const filtrados = globals.trabajadoresGlobal.filter(t =>
            (t.username || "").toLowerCase().includes(q)
        );

        const p = filtrados.filter(t => (t.estado || "pendiente") !== "aprobado");
        const a = filtrados.filter(t => (t.estado || "pendiente") === "aprobado");

        pintarTrabajadores(p, "trabajadorGridPendientes", true);
        pintarTrabajadores(a, "trabajadorGridAprobados", false);
    };

    document.getElementById("btnNuevoTrabajador").onclick = () => nuevoTrabajador();

    bindTrabajadorPopups();
}

function pintarTrabajadores(lista, gridId, isPendiente) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    if (!lista || lista.length === 0) {
        grid.innerHTML = `<p class="empty-text">${isPendiente ? "No hay pendientes." : "No hay trabajadores."}</p>`;
        return;
    }

    grid.innerHTML = lista.map((t) => {
        const indexReal = globals.trabajadoresGlobal.findIndex(x => String(x.id) === String(t.id));
        const badge = isPendiente
            ? `<div style="margin-top:6px;">
      <span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:999px;font-size:12px;">
        Pendiente
      </span>
    </div>`
            : "";


        return `
      <div class="trabajador-card-view" data-idx="${indexReal}">
        <div class="trabajador-avatar-container">
          ${getAvatarHTML(t.imagen, t.username, "list")}
        </div>
        <div class="trabajador-info">
          <h3>${t.username}</h3>
          <p><b>Email:</b> ${t.email}</p>
          <p><b>Empresa:</b> ${nombreEmpresa(t.empresa_id)}</p>
          ${badge}
        </div>
      </div>
    `;
    }).join("");

    grid.querySelectorAll(".trabajador-card-view").forEach(card => {
        card.onclick = () => abrirTrabajador(Number(card.dataset.idx));
    });
}

function nombreEmpresa(id) {
    return globals.empresasGlobalList.find(e => String(e.id) === String(id))?.nombre || "Sin asignar";
}

function abrirTrabajador(index) {
    globals.trabajadorIndex = index;
    globals.trabajadorActual = globals.trabajadoresGlobal[index];

    const t = globals.trabajadorActual;

    document.getElementById("trViewNombre").textContent = t.username;
    document.getElementById("trViewEmail").textContent = t.email;
    document.getElementById("trViewEmpresa").textContent = nombreEmpresa(t.empresa_id);

    document.getElementById("trViewImgContainer").innerHTML =
        getAvatarHTML(t.imagen, t.username, "popup");

    const btnAprobar = document.getElementById("btnAprobarTrabajador");
    if (btnAprobar) {
        const pendiente = (t.estado || "pendiente") !== "aprobado";
        btnAprobar.style.display = pendiente ? "inline-block" : "none";
    }



    document.getElementById("popupTrabajadorView").style.display = "flex";
}

function nuevoTrabajador() {
    globals.trabajadorIndex = null;
    globals.trabajadorActual = null;

    document.getElementById("popupTrabajadorTitulo").textContent = "Nuevo trabajador";

    limpiarPopupTrabajador();
    cargarEmpresasEnSelect();

    document.getElementById("trImagen").value = "";
    document.getElementById("popupTrabajador").style.display = "flex";
}

function bindTrabajadorPopups() {
    const cerrarView = document.getElementById("trViewClose");
    if (cerrarView) cerrarView.onclick = () => {
        document.getElementById("popupTrabajadorView").style.display = "none";
    };

    const cancelar = document.getElementById("cancelarTrabajadorPopup");
    if (cancelar) cancelar.onclick = () => {
        limpiarPopupTrabajador();
        document.getElementById("popupTrabajador").style.display = "none";
    };

    const guardar = document.getElementById("guardarTrabajadorPopup");
    if (guardar) guardar.onclick = guardarTrabajador;

    // ✅ APROBAR
    const btnAprobar = document.getElementById("btnAprobarTrabajador");
    if (btnAprobar) btnAprobar.onclick = async () => {
        const t = globals.trabajadorActual;
        if (!t) return;

        if (!confirm(`¿Aprobar a "${t.username}"?`)) return;

        if (!window.api?.aprobarTrabajador) {
            alert("Falta aprobarTrabajador en preload.js");
            return;
        }

        await window.api.aprobarTrabajador({ id: t.id });

        document.getElementById("popupTrabajadorView").style.display = "none";
        renderTrabajadores(document.getElementById("mainContent"));
    };

    const editar = document.getElementById("trEditarBtn");
    if (editar) editar.onclick = () => {
        if (!globals.trabajadorActual) return;

        globals.trabajadorIndex = globals.trabajadoresGlobal.findIndex(t => t.id === globals.trabajadorActual.id);

        document.getElementById("trNombre").value = globals.trabajadorActual.username;
        document.getElementById("trEmail").value = globals.trabajadorActual.email;

        cargarEmpresasEnSelect();

        if (globals.trabajadorActual.empresa_id) {
            document.getElementById("trEmpresaSelect").value = globals.trabajadorActual.empresa_id;
        }

        document.getElementById("popupTrabajadorView").style.display = "none";
        document.getElementById("popupTrabajadorTitulo").textContent = "Editar trabajador";
        document.getElementById("popupTrabajador").style.display = "flex";
    };

    const borrar = document.getElementById("borrarTrabajadorPreview");
    if (borrar) borrar.onclick = async () => {
        if (!globals.trabajadorActual) return;
        if (!confirm("¿Eliminar este trabajador?")) return;

        await api.deleteTrabajador(globals.trabajadorActual.id);

        globals.trabajadoresGlobal = globals.trabajadoresGlobal.filter(t => t.id !== globals.trabajadorActual.id);

        document.getElementById("popupTrabajadorView").style.display = "none";
        renderTrabajadores(document.getElementById("mainContent"));
    };
}

async function guardarTrabajador() {
    const nombre = document.getElementById("trNombre").value.trim();
    const email = document.getElementById("trEmail").value.trim();
    const empresa_id = document.getElementById("trEmpresaSelect").value || null;
    const imgInput = document.getElementById("trImagen");

    if (!nombre || !email) {
        alert("Rellena todos los campos.");
        return;
    }

    let imagen = globals.trabajadorIndex !== null
        ? globals.trabajadoresGlobal[globals.trabajadorIndex].imagen
        : null;

    if (imgInput?.files?.length > 0) {
        imagen = await fileToBase64(imgInput.files[0]);
    }

    const esEdicion = globals.trabajadorIndex !== null;

    if (esEdicion) {
        await api.updateTrabajador({
            id: globals.trabajadoresGlobal[globals.trabajadorIndex].id,
            username: nombre,
            email,
            empresa_id,
            imagen
        });
    } else {
        await api.addTrabajador({
            username: nombre,
            email,
            password: "1234",
            empresa_id,
            imagen
        });
    }

    document.getElementById("popupTrabajador").style.display = "none";
    renderTrabajadores(document.getElementById("mainContent"));
}

function cargarEmpresasEnSelect() {
    const sel = document.getElementById("trEmpresaSelect");
    if (!sel) return;

    sel.innerHTML = globals.empresasGlobalList.map(e =>
        `<option value="${e.id}">${e.nombre}</option>`
    ).join("");
}

function limpiarPopupTrabajador() {
    document.getElementById("trNombre").value = "";
    document.getElementById("trEmail").value = "";
    const sel = document.getElementById("trEmpresaSelect");
    if (sel) sel.value = "";
}
