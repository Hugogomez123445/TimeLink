// ========================================================
// TimeLink - renderer1.js optimizado
// ========================================================

// ======================
// DATOS DEL USUARIO
// ======================
const userId = localStorage.getItem("userId");
const role = localStorage.getItem("role") || "cliente";
const username = localStorage.getItem("username") || "Usuario";
const userEmail = localStorage.getItem("email") || "email@example.com";

// Rellenar info del header
document.getElementById("userName").textContent = username;
document.getElementById("userEmail").textContent = userEmail;


// ======================
// API WRAPPERS (NUEVA BD: admins / trabajadores / clientes)
// ======================
async function apiGetEmpresas() {
    return await window.api.getEmpresas();
}

async function apiGetTrabajadores() {
    // ya la tienes
    return await window.api.getTrabajadores();
}

async function apiGetClientes() {
    // NUEVO: debe existir en preload/main
    if (!window.api.getClientes) return [];
    return await window.api.getClientes();
}

async function apiDeleteCliente(id) {
    if (!window.api.deleteCliente) throw new Error("deleteCliente no existe en preload");
    return await window.api.deleteCliente(id);
}

async function apiGetAdmins() {
    // opcional si quieres listarlos
    if (!window.api.getAdmins) return [];
    return await window.api.getAdmins();
}

// ======================
// CONTROL DE PERMISOS POR ROL
// ======================
const btnCalendario = document.getElementById("btnCalendario");
const btnClientes = document.getElementById("btnClientes");
const btnCitas = document.getElementById("btnCitas");
const btnEmpresas = document.getElementById("btnEmpresas");
const btnTrabajadores = document.getElementById("btnTrabajadores");
const adminPanelBtn = document.getElementById("adminPanelBtn");
const submenuAdminContainer = document.getElementById("submenuAdminContainer");

// Cliente
if (role === "cliente") {
    if (btnTrabajadores) btnTrabajadores.style.display = "none";
    if (btnEmpresas) btnEmpresas.style.display = "none";
    if (adminPanelBtn) adminPanelBtn.style.display = "none";
}

// Trabajador
if (role === "trabajador") {
    if (btnTrabajadores) btnTrabajadores.style.display = "none";
    if (btnEmpresas) btnEmpresas.style.display = "none";
    if (adminPanelBtn) adminPanelBtn.style.display = "block"; // Panel Admin básico
}

// Admin
if (role === "admin") {
    if (btnCalendario) btnCalendario.style.display = "none";
    if (btnClientes) btnClientes.style.display = "none";
    if (btnCitas) btnCitas.style.display = "none";
    if (adminPanelBtn) adminPanelBtn.style.display = "none";

    if (btnTrabajadores) btnTrabajadores.style.display = "block";
    if (btnEmpresas) btnEmpresas.style.display = "block";
}

// Submenú solo admin
if (submenuAdminContainer) {
    submenuAdminContainer.style.display = role === "admin" ? "block" : "none";
}

// ======================
// VARIABLES GLOBALES
// ======================
let calendar = null;
let popupFecha = "";
let popupHora = "";
let isEditing = false;
let editingEvent = null;
let editingId = null;

// EMPRESAS
let empresasGlobal = [];
let empresaIndex = null;
let empresaActual = null;

// TRABAJADORES
let trabajadoresGlobal = [];
let trabajadorIndex = null;
let trabajadorActual = null;
let empresasGlobalList = []; // Empresas para el select de trabajador

// ======================
// HELPERS
// ======================
function getInicial(nombre) {
    return nombre ? nombre.charAt(0).toUpperCase() : "?";
}

function getAvatarHTML(imagen, nombre, tipo = "card") {
    const inicial = getInicial(nombre);

    if (tipo === "popup") {
        return imagen
            ? `<img class="trabajador-avatar-popup" src="${imagen}">`
            : `<div class="trabajador-avatar-popup-inicial">${inicial}</div>`;
    }

    // tarjeta/lista
    return imagen
        ? `<img class="trabajador-avatar" src="${imagen}">`
        : `<div class="trabajador-avatar-inicial">${inicial}</div>`;
}

// === AVATAR DEL SIDEBAR ===
function loadSidebarAvatar() {
    const cont = document.getElementById("sidebarAvatar");
    const imagen = localStorage.getItem("imagen") || null;
    const inicial = (username?.charAt(0) || "?").toUpperCase();

    if (imagen) {
        cont.innerHTML = `<img src="${imagen}" />`;
    } else {
        cont.textContent = inicial;
    }
}

loadSidebarAvatar();


function fileToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

const empresaId = localStorage.getItem("seleccion_empresa");
const trabajadorIdSel = localStorage.getItem("seleccion_trabajador");


// ======================
// NAVEGACIÓN PRINCIPAL
// ======================
function setActiveButton(section) {
    const buttons = document.querySelectorAll(".menu button");
    buttons.forEach(btn => btn.classList.remove("active"));

    const map = {
        inicio: "btnInicio",
        calendario: "btnCalendario",
        clientes: "btnClientes",
        citas: "btnCitas",
        ajustes: "btnAjustes",
        adminPanel: "adminPanelBtn",
        empresas: "btnEmpresas",
        trabajadores: "btnTrabajadores",
    };

    const id = map[section];
    if (id) {
        const btn = document.getElementById(id);
        if (btn) btn.classList.add("active");
    }
}

function navigate(section) {
    const main = document.getElementById("mainContent");
    setActiveButton(section);

    switch (section) {
        case "inicio":
            if (role === "admin") cargarInicioAdmin();
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

        case "adminUsuarios":
            renderAdminUsuarios(main);
            break;

        case "adminCitas":
            renderAdminCitas(main);
            break;

        case "empresas":
            renderEmpresas(main);
            break;

        case "trabajadores":
            renderTrabajadores(main);
            break;


    }
}

// Hacer accesible desde el HTML inline
window.navigate = navigate;

// ======================
// CALENDARIO (PRO)
// ======================

// Helpers que te faltaban (evita errores)
function getSelectedEmpresaId() {
    return localStorage.getItem("seleccion_empresa");
}
function getSelectedTrabajadorId() {
    return localStorage.getItem("seleccion_trabajador");
}

async function seleccionarEmpresa(main) {
    const empresas = await window.api.getEmpresas();

    main.innerHTML = `
    <h1>Selecciona una empresa 🏢</h1>
    <div class="empresa-grid">
      ${empresas.map(e => `
        <div class="empresa-card-view" onclick="seleccionarTrabajador(${e.id})">
          <img src="${e.imagen || '../assets/default_company.png'}" class="empresa-img">
          <div class="empresa-info">
            <h3>${e.nombre}</h3>
            <p>${e.direccion || 'Sin dirección'}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function seleccionarTrabajador(empresaId) {
    const main = document.getElementById("mainContent");

    const trabajadores = await window.api.getTrabajadores();
    const lista = trabajadores.filter(t => t.empresa_id == empresaId);

    main.innerHTML = `
    <h1>Selecciona un trabajador 👷‍♂️</h1>
    <div class="empresa-grid">
      ${lista.map(t => `
        <div class="trabajador-card-view" onclick="abrirCalendarioTrabajador(${t.id}, ${empresaId})">
          <div class="trabajador-avatar-container">
            ${getAvatarHTML(t.imagen, t.username)}
          </div>
          <div class="trabajador-info">
            <h3>${t.username}</h3>
            <p>${t.email}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function abrirCalendarioTrabajador(trabajadorId, empresaId) {
    localStorage.setItem("seleccion_trabajador", trabajadorId);
    localStorage.setItem("seleccion_empresa", empresaId);

    const main = document.getElementById("mainContent");
    renderCalendario(main);
}

async function renderCalendario(main) {
    main.innerHTML = `
    <h1>Calendario 📅</h1>
    <div id="calendar" style="margin-top:20px;"></div>

    <div id="hourPanel" class="hour-panel" style="display:none;">
      <h3>Selecciona una hora:</h3>
      <div id="hourList" class="hour-list"></div>
    </div>
  `;

    setTimeout(async () => {
        const hourPanel = document.getElementById("hourPanel");
        const hourList = document.getElementById("hourList");
        const calendarEl = document.getElementById("calendar");

        const empresaId = getSelectedEmpresaId();
        const trabajadorIdSel = getSelectedTrabajadorId();

        // --- calendario ---
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: "dayGridMonth",
            locale: "es",
            firstDay: 1,
            height: "auto",
            selectable: true,
            headerToolbar: {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
            },

            dateClick(info) {
                // al cambiar de día, regeneramos horas
                generateHours(info.dateStr);
            },

            eventClick: async (info) => {
                const ev = info.event;
                const id = ev.extendedProps.id;

                const opcion = prompt(
                    `¿Qué desea hacer?
1 = Marcar como COMPLETADA
2 = CANCELAR cita
3 = EDITAR
4 = BORRAR (definitivo)
(Escriba 1/2/3/4)`
                );

                if (!opcion) return;

                // helper: refrescar horas si el panel está abierto
                const refreshHourPanel = () => {
                    const hourPanel = document.getElementById("hourPanel");
                    if (hourPanel && hourPanel.style.display === "block") {
                        const dateStr = hourPanel.dataset.date;
                        if (dateStr) generateHours(dateStr);
                    }
                };

                // COMPLETAR
                if (opcion === "1") {
                    await window.api.setCitaEstado({ id, estado: "completada" });
                    const color = "#16a34a";
                    ev.setProp("backgroundColor", color);
                    ev.setProp("borderColor", color);
                    ev.setExtendedProp("estado", "completada");
                    refreshHourPanel();
                    return;
                }

                // CANCELAR
                if (opcion === "2") {
                    await window.api.setCitaEstado({ id, estado: "cancelada" });
                    const color = "#9ca3af";
                    ev.setProp("backgroundColor", color);
                    ev.setProp("borderColor", color);
                    ev.setExtendedProp("estado", "cancelada");
                    refreshHourPanel(); // ✅ esto hace que vuelva verde
                    return;
                }

                // EDITAR
                if (opcion === "3") {
                    openEditPopup(ev);
                    return;
                }

                // BORRAR definitivo
                if (opcion === "4") {
                    if (!confirm("¿Eliminar definitivamente esta cita?")) return;
                    await window.api.deleteCita(id);
                    ev.remove();
                    refreshHourPanel();
                    return;
                }
            }


        });

        calendar.render();

        // ✅ Cargar y pintar citas al abrir
        await loadAndPaintCitas();

        // =========================
        // Cargar citas + pintar ROJO
        // =========================
        async function loadAndPaintCitas() {
            const citas = await window.api.getCitas("ALL");

            // ✅ Filtrar por trabajador + empresa (compatibilidad vieja/nueva)
            const filtradas = citas.filter(c => {
                const tId = c.trabajador_id ?? c.userId ?? c.trabajadorId;
                const eId = c.empresa_id ?? c.empresaId;
                const okTrab = String(tId) === String(trabajadorIdSel);
                const okEmp = empresaId ? String(eId) === String(empresaId) : true;
                return okTrab && okEmp;
            });

            // ✅ limpiar eventos antes de repintar
            calendar.removeAllEvents();

            filtradas.forEach(c => addCitaToCalendar(c));
        }

        // =========================
        // Generar horas verde/rojo
        // =========================
        function generateHours(dateStr) {
            hourList.innerHTML = "";
            hourPanel.style.display = "block";
            hourPanel.dataset.date = dateStr;

            // horas ocupadas (por eventos ya pintados)
            const ocupadas = calendar.getEvents()
                .filter(ev => {
                    const sameDay = ev.start.toISOString().split("T")[0] === dateStr;
                    const estado = ev.extendedProps?.estado || "reservado";
                    return sameDay && estado !== "cancelada"; // ✅ cancelada NO bloquea
                })
                .map(ev => ev.start.toTimeString().slice(0, 5));

            for (let min = 9 * 60; min <= 18 * 60; min += 30) {
                const h = String(Math.floor(min / 60)).padStart(2, "0");
                const m = String(min % 60).padStart(2, "0");
                const hora = `${h}:${m}`;

                const btn = document.createElement("button");
                btn.className = ocupadas.includes(hora) ? "hour-btn busy" : "hour-btn free";
                btn.textContent = hora;

                if (ocupadas.includes(hora)) {
                    // 🔴 ocupada: NO clickable
                    btn.disabled = true;
                } else {
                    // 🟢 libre
                    btn.onclick = () => openNewCitaPopup(dateStr, hora);
                }

                hourList.appendChild(btn);
            }
        }

        // --- NUEVA CITA ---
        function openNewCitaPopup(date, hour) {
            isEditing = false;
            editingId = null;

            popupFecha = date;
            popupHora = hour;

            document.getElementById("citaCliente").value = username;
            document.getElementById("citaTelefono").value = "";
            document.getElementById("citaNota").value = "";
            document.getElementById("popupTitulo").textContent = "Nueva cita";

            document.getElementById("popupCita").style.display = "flex";
        }

        // --- EDITAR CITA ---
        function openEditPopup(ev) {
            isEditing = true;
            editingEvent = ev;
            editingId = ev.extendedProps.id;

            const ext = ev.extendedProps;

            popupFecha = ev.start.toISOString().split("T")[0];
            popupHora = ev.start.toTimeString().slice(0, 5);

            document.getElementById("citaCliente").value = ext.cliente || "";
            document.getElementById("citaTelefono").value = ext.telefono || "";
            document.getElementById("citaNota").value = ext.nota || "";

            document.getElementById("popupTitulo").textContent = "Editar cita";
            document.getElementById("popupCita").style.display = "flex";
        }

        // --- ELIMINAR CITA ---
        async function deleteEvent(ev) {
            if (!confirm("¿Eliminar esta cita?")) return;

            try {
                await window.api.deleteCita(ev.extendedProps.id);
            } catch (e) {
                console.error("Error borrando cita:", e);
            }

            ev.remove();

            // 🔥 refrescar panel de horas si está abierto
            const d = hourPanel.dataset.date;
            if (d) generateHours(d);
        }

        // =========================
        // GUARDAR POPUP (sin duplicar, con constraint controlado)
        // =========================
        document.getElementById("guardarPopup").onclick = async () => {
            const trabajadorId = getSelectedTrabajadorId();
            const empresaId = getSelectedEmpresaId();

            const cliente = document.getElementById("citaCliente").value.trim();
            const telefono = document.getElementById("citaTelefono").value.trim();
            const nota = document.getElementById("citaNota").value.trim();

            if (!cliente || !popupFecha || !popupHora) {
                alert("Faltan datos.");
                return;
            }

            const payload = {
                id: editingId || null,
                fecha: popupFecha,
                hora: popupHora,
                cliente,
                telefono,
                nota,
                estado: "reservado",
                // compatibilidad vieja/nueva:
                userId: trabajadorId,
                trabajador_id: trabajadorId,
                empresa_id: empresaId,
                username
            };

            try {
                if (isEditing && editingId) {
                    await window.api.updateCita(payload);
                } else {
                    await window.api.addCita(payload);
                }

                // ✅ Cerramos popup
                document.getElementById("popupCita").style.display = "none";

                // ✅ recargar desde BD para que:
                // - se pinte ROJO siempre
                // - no haya duplicados
                await loadAndPaintCitas();

                // ✅ refrescar panel horas del día abierto (para que se vuelva rojo y disabled)
                const d = hourPanel.dataset.date;
                if (d) generateHours(d);

            } catch (err) {
                console.error("❌ Error guardando cita:", err);

                // ✅ si está ocupada, avisar y refrescar para que salga roja
                if (String(err?.message || "").includes("UNIQUE constraint failed")) {
                    alert("⚠️ Esa hora ya está reservada.");
                    await loadAndPaintCitas();
                    const d = hourPanel.dataset.date;
                    if (d) generateHours(d);
                    return;
                }

                alert("❌ No se pudo guardar la cita. Mira la consola (F12).");
            }
            // --- NUEVA CITA (OPCIÓN A: reusar cancelada si existe) ---
            const resCancelada = await window.api.findCitaCancelada({
                empresa_id: payload.empresa_id,
                trabajador_id: payload.trabajador_id,
                fecha: payload.fecha,
                hora: payload.hora
            });

            if (resCancelada && resCancelada.id) {
                // ✅ Reactivar la cita cancelada (UPDATE en lugar de INSERT)
                payload.id = resCancelada.id;

                await window.api.updateCita({
                    id: payload.id,
                    fecha: payload.fecha,
                    hora: payload.hora,
                    cliente: payload.cliente,
                    telefono: payload.telefono,
                    nota: payload.nota,
                    estado: "reservado",
                    empresa_id: payload.empresa_id,
                    trabajador_id: payload.trabajador_id,
                    userId: payload.userId,
                    username: payload.username
                });

            } else {
                // ✅ Insert normal
                const res = await window.api.addCita(payload);
                payload.id = res?.id || res?.lastID || null;
            }

        };



        document.getElementById("cancelarPopup").onclick = () => {
            document.getElementById("popupCita").style.display = "none";
        };

    }, 50);
}

// =========================
// Pintar cita en calendario (SIEMPRE ROJO)
// =========================
function getColorByEstado(estado) {
    if (estado === "cancelada") return "#9ca3af";   // gris
    if (estado === "completada") return "#16a34a";  // verde
    return "#dc2626"; // reservado rojo (o tu azul si prefieres)
}

function addCitaToCalendar(c) {
    if (!calendar) return;

    const estado = c.estado || "reservado";
    const color =
        estado === "completada" ? "#16a34a" :
            estado === "cancelada" ? "#9ca3af" :
                "#dc2626"; // reservado = rojo

    calendar.addEvent({
        title: c.cliente || "Reservado",
        start: (c.hora && c.hora.length === 5)
            ? `${c.fecha}T${c.hora}:00`
            : `${c.fecha}T${c.hora}`,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { ...c, id: c.id ?? c.cita_id ?? c.citaId }
    });
}




// ======================
// CLIENTES (solo admin / trabajador)
// ======================
async function renderClientes(main) {
    if (role !== "admin" && role !== "trabajador") {
        main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
        return;
    }

    const clientes = await apiGetClientes();
    const citas = await window.api.getCitas("ALL");

    main.innerHTML = `
    <h1>Clientes 👤</h1>

    <div class="clientes-layout">
      <div class="clientes-card">
        <h3>Lista de clientes</h3>
        <p class="sub">Selecciona un cliente para ver sus citas.</p>
        <div id="clientesListaInner"></div>
      </div>

      <div class="clientes-card cliente-citas">
        <h3 id="clienteTitulo">Citas del cliente</h3>
        <div id="clienteCitasContenido" class="cliente-citas-contenido">
          Aún no has seleccionado ningún cliente.
        </div>
      </div>
    </div>
  `;

    const listaDiv = document.getElementById("clientesListaInner");
    const contenidoDiv = document.getElementById("clienteCitasContenido");
    const tituloCliente = document.getElementById("clienteTitulo");

    if (clientes.length === 0) {
        listaDiv.innerHTML = `<p>No hay clientes.</p>`;
        return;
    }

    clientes.forEach(cli => {
        const nombre = cli.nombre || cli.username || "";

        const item = document.createElement("div");
        item.className = "cliente-item";
        item.textContent = nombre;

        item.onclick = () => {
            tituloCliente.textContent = `Citas de ${nombre}`;

            // compatibilidad: si hoy tus citas guardan "cliente" en texto
            const citasCliente = citas.filter(c => (c.cliente || "").trim() === nombre.trim());

            if (citasCliente.length === 0) {
                contenidoDiv.innerHTML = `<p>Este cliente no tiene citas.</p>`;
                return;
            }

            let html = `
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Teléfono</th>
              <th>Nota</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
      `;

            citasCliente.forEach(c => {
                html += `
          <tr>
            <td>${c.fecha}</td>
            <td>${c.hora}</td>
            <td>${c.telefono || ""}</td>
            <td>${c.nota || ""}</td>
            <td>${c.username || ""}</td>
          </tr>
        `;
            });

            html += "</tbody></table>";
            contenidoDiv.innerHTML = html;
        };

        listaDiv.appendChild(item);
    });
}


// ======================
// ADMIN - USUARIOS
// ======================
async function renderAdminUsuarios(main) {
    // En la nueva BD: "usuarios" = clientes (admins y trabajadores se gestionan en sus secciones)
    const clientes = await apiGetClientes();

    main.innerHTML = `
    <h1>Gestión de Clientes 👥</h1>

    <table class="admin-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Teléfono</th>
          <th>Empresa</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="tablaClientes"></tbody>
    </table>
  `;

    const tbody = document.getElementById("tablaClientes");
    tbody.innerHTML = "";

    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">No hay clientes.</td></tr>`;
        return;
    }

    // si en tu tabla clientes guardas empresa_id, lo pintamos
    const empresas = await apiGetEmpresas();

    function nombreEmpresa(id) {
        return empresas.find(e => String(e.id) === String(id))?.nombre || "—";
    }

    clientes.forEach(c => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nombre || c.username || ""}</td>
      <td>${c.email || ""}</td>
      <td>${c.telefono || ""}</td>
      <td>${nombreEmpresa(c.empresa_id)}</td>
      <td>
        <button data-del="${c.id}" class="btn-danger">Eliminar</button>
      </td>
    `;

        tbody.appendChild(tr);
    });

    tbody.querySelectorAll("button[data-del]").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.getAttribute("data-del");
            if (!confirm("¿Eliminar este cliente?")) return;

            await apiDeleteCliente(id);
            renderAdminUsuarios(main);
        };
    });
}


// ======================
// ADMIN - CITAS
// ======================
async function renderAdminCitas(main) {
    const citas = await window.api.getCitas("ALL");

    main.innerHTML = `
        <h1>Todas las citas 📅</h1>

        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Teléfono</th>
                    <th>Usuario</th>
                    <th>Acciones</th>
                </tr>
            </thead>

            <tbody id="tablaCitas"></tbody>
        </table>
    `;

    const tbody = document.getElementById("tablaCitas");

    citas.forEach(c => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${c.id}</td>
            <td>${c.cliente}</td>
            <td>${c.fecha}</td>
            <td>${c.hora}</td>
            <td>${c.telefono || ""}</td>
            <td>${c.username || ""}</td>

            <td>
                <button class="btn-edit" data-edit="${c.id}">Editar</button>
                <button class="btn-danger" data-del="${c.id}">Eliminar</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    tbody.querySelectorAll("button[data-edit]").forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute("data-edit");
            const c = citas.find(ci => ci.id == id);
            openEditPopupFromAdmin(c);
        };
    });

    tbody.querySelectorAll("button[data-del]").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("¿Eliminar esta cita?")) return;
            await window.api.deleteCita(btn.getAttribute("data-del"));
            renderAdminCitas(main);
        };
    });
}

function openEditPopupFromAdmin(c) {
    isEditing = true;
    editingEvent = null;
    editingId = c.id;

    popupFecha = c.fecha;
    popupHora = c.hora;

    document.getElementById("citaCliente").value = c.cliente;
    document.getElementById("citaTelefono").value = c.telefono || "";
    document.getElementById("citaNota").value = c.nota || "";

    document.getElementById("popupTitulo").textContent = "Editar cita";
    document.getElementById("popupCita").style.display = "flex";
}

// ======================
// EMPRESAS
// ======================
async function renderEmpresas(main) {
    if (role !== "admin") {
        main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
        return;
    }

    empresasGlobal = await window.api.getEmpresas();

    main.innerHTML = `
        <h1 class="title-page">Empresas 🏢</h1>

        <div class="empresa-toolbar">
            <button class="btn-primary add-empresa-btn" onclick="nuevaEmpresa()">
                ➕ Añadir empresa
            </button>

            <input id="buscarEmpresa"
                class="empresa-search"
                type="text"
                placeholder="🔍 Buscar empresa...">
        </div>

        <div id="empresaGrid" class="empresa-grid"></div>
    `;

    pintarEmpresas(empresasGlobal);

    document.getElementById("buscarEmpresa").oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const filtradas = empresasGlobal.filter(emp =>
            emp.nombre.toLowerCase().includes(q)
        );
        pintarEmpresas(filtradas);
    };
}

function pintarEmpresas(lista) {
    const grid = document.getElementById("empresaGrid");
    if (!grid) return;

    if (lista.length === 0) {
        grid.innerHTML = `<p class="empty-text">No hay empresas que coincidan con la búsqueda.</p>`;
        return;
    }

    grid.innerHTML = lista.map((e, index) => `
        <div class="empresa-card-view" onclick="abrirEmpresa(${index})">
            <img src="${e.imagen || '../assets/default_company.png'}" class="empresa-img">
            <div class="empresa-info">
                <h3>${e.nombre}</h3>
                <p><b>Dirección:</b> ${e.direccion || "—"}</p>
                <p><b>Teléfono:</b> ${e.telefono || "—"}</p>
            </div>
        </div>
    `).join("");
}

async function eliminarEmpresa(ev, id) {
    ev.stopPropagation();
    if (!confirm("¿Eliminar esta empresa?")) return;

    await window.api.deleteEmpresa(id);
    empresasGlobal = empresasGlobal.filter(e => e.id !== id);
    pintarEmpresas(empresasGlobal);
}

function nuevaEmpresa() {
    empresaIndex = null;
    limpiarPopupEmpresa();
    document.getElementById("popupEmpresa").style.display = "flex";
}

document.getElementById("cancelarEmpresaPopup").onclick = () => {
    limpiarPopupEmpresa();
    document.getElementById("popupEmpresa").style.display = "none";
};

document.getElementById("guardarEmpresaPopup").onclick = async () => {
    const nombreInput = document.getElementById("empNombre");
    const direccionInput = document.getElementById("empDireccion");
    const telefonoInput = document.getElementById("empTelefono");
    const imgInput = document.getElementById("empImagen");

    const nombre = nombreInput.value.trim();
    const direccion = direccionInput.value.trim();
    const telefono = telefonoInput.value.trim();

    if (!nombre) {
        alert("El nombre es obligatorio.");
        return;
    }

    let imagen = (empresaIndex !== null && empresaIndex !== undefined)
        ? empresasGlobal[empresaIndex].imagen
        : null;

    if (imgInput.files.length > 0) {
        imagen = await fileToBase64(imgInput.files[0]);
    }

    const esEdicion = empresaIndex !== null && empresaIndex !== undefined;

    if (esEdicion) {
        await window.api.updateEmpresa({
            id: empresasGlobal[empresaIndex].id,
            nombre,
            direccion,
            telefono,
            imagen
        });
    } else {
        await window.api.addEmpresa({
            nombre,
            direccion,
            telefono,
            imagen
        });
    }

    limpiarPopupEmpresa();
    document.getElementById("popupEmpresa").style.display = "none";
    const main = document.getElementById("mainContent");
    await renderEmpresas(main);
};

function limpiarPopupEmpresa() {
    document.getElementById("empNombre").value = "";
    document.getElementById("empDireccion").value = "";
    document.getElementById("empTelefono").value = "";
    document.getElementById("empImagen").value = "";
}

function abrirEmpresa(index) {
    empresaIndex = index;
    empresaActual = empresasGlobal[index];

    document.getElementById("empresaViewImg").src =
        empresaActual.imagen || "../assets/default_company.png";

    document.getElementById("empresaViewNombre").textContent = empresaActual.nombre;
    document.getElementById("empresaViewDireccion").textContent =
        "📍 " + (empresaActual.direccion || "Sin dirección");
    document.getElementById("empresaViewTelefono").textContent =
        "📞 " + (empresaActual.telefono || "Sin teléfono");

    document.getElementById("popupEmpresaView").style.display = "flex";
}

document.getElementById("empresaViewClose").onclick = () => {
    document.getElementById("popupEmpresaView").style.display = "none";
};

document.getElementById("empresaEditBtn").onclick = () => {
    const e = empresasGlobal[empresaIndex];

    document.getElementById("empNombre").value = e.nombre;
    document.getElementById("empDireccion").value = e.direccion || "";
    document.getElementById("empTelefono").value = e.telefono || "";

    document.getElementById("popupEmpresaView").style.display = "none";
    document.getElementById("popupEmpresa").style.display = "flex";
};

document.getElementById("borrarEmpresaPreview").onclick = async () => {
    if (!empresaActual) return;

    const confirmar = confirm(
        `¿Seguro que quieres eliminar "${empresaActual.nombre}"?`
    );
    if (!confirmar) return;

    await window.api.deleteEmpresa(empresaActual.id);
    empresasGlobal = empresasGlobal.filter(e => e.id !== empresaActual.id);

    document.getElementById("popupEmpresaView").style.display = "none";
    pintarEmpresas(empresasGlobal);
};

// ======================
// TRABAJADORES
// ======================
async function renderTrabajadores(main) {
    if (role !== "admin") {
        main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
        return;
    }

    const trabajadores = await window.api.getTrabajadores();
    const empresas = await window.api.getEmpresas();

    trabajadoresGlobal = trabajadores;
    empresasGlobalList = empresas;

    main.innerHTML = `
  <h1 class="title-page">Trabajadores 👷‍♂️</h1>

  <div class="trabajador-toolbar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
      
      <button class="btn-primary add-empresa-btn" onclick="nuevoTrabajador()">
          ➕ Añadir trabajador
      </button>

      <button class="btn-primary" onclick="verTodasLasCitas()" style="background:#111827;">
          📅 Ver las citas
      </button>

      <input 
          type="text"
          id="buscarTrabajador"
          class="empresa-search"
          placeholder="🔎 Buscar trabajador..."
      >
  </div>

  <div id="trabajadorGrid" class="empresa-grid"></div>
`;


    pintarTrabajadores(trabajadoresGlobal);

    document.getElementById("buscarTrabajador").oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const filtrados = trabajadoresGlobal.filter(t =>
            (t.username || "").toLowerCase().includes(q)
        );
        pintarTrabajadores(filtrados);
    };
}

function verTodasLasCitas() {
    // Limpia filtros “guardados” por si antes filtrabas por trabajador/empresa
    localStorage.removeItem("citasFiltroTrabajador");
    localStorage.removeItem("citasFiltroEmpresa");

    navigate("citas");
}

window.verTodasLasCitas = verTodasLasCitas;


function pintarTrabajadores(lista) {
    const grid = document.getElementById("trabajadorGrid");
    if (!grid) return;

    if (lista.length === 0) {
        grid.innerHTML = `<p class="empty-text">No hay trabajadores.</p>`;
        return;
    }

    grid.innerHTML = lista.map((t, index) => `
        <div class="trabajador-card-view" onclick="abrirTrabajador(${index})">
            <div class="trabajador-avatar-container">
                ${getAvatarHTML(t.imagen, t.username, "list")}
            </div>
            <div class="trabajador-info">
                <h3>${t.username}</h3>
                <p><b>Email:</b> ${t.email}</p>
                <p><b>Empresa:</b> ${t.empresaNombre || "Sin asignar"}</p>
            </div>
        </div>
    `).join("");
}

function abrirTrabajador(index) {
    trabajadorIndex = index;
    trabajadorActual = trabajadoresGlobal[index];

    document.getElementById("trViewNombre").textContent = trabajadorActual.username;
    document.getElementById("trViewEmail").textContent = trabajadorActual.email;

    const empresa = empresasGlobalList.find(e => e.id === trabajadorActual.empresa_id);
    document.getElementById("trViewEmpresa").textContent =
        empresa ? empresa.nombre : "Sin asignar";

    document.getElementById("trViewImgContainer").innerHTML =
        getAvatarHTML(trabajadorActual.imagen, trabajadorActual.username, "popup");

    document.getElementById("popupTrabajadorView").style.display = "flex";
}

function nuevoTrabajador() {
    trabajadorIndex = null;
    trabajadorActual = null;

    document.getElementById("popupTrabajadorTitulo").textContent = "Nuevo trabajador";

    limpiarPopupTrabajador();
    cargarEmpresasEnSelect();

    // VACÍA la imagen también
    document.getElementById("trImagen").value = "";

    document.getElementById("popupTrabajador").style.display = "flex";
}


document.getElementById("guardarTrabajadorPopup").onclick = async () => {
    const nombre = document.getElementById("trNombre").value.trim();
    const email = document.getElementById("trEmail").value.trim();
    const empresa_id = document.getElementById("trEmpresaSelect").value || null;
    const imgInput = document.getElementById("trImagen");

    if (!nombre || !email) {
        alert("Rellena todos los campos.");
        return;
    }

    let imagen = trabajadorIndex !== null
        ? trabajadoresGlobal[trabajadorIndex].imagen
        : null;

    if (imgInput.files.length > 0) {
        imagen = await fileToBase64(imgInput.files[0]);
    }

    const esEdicion = trabajadorIndex !== null;

    if (esEdicion) {
        await window.api.updateTrabajador({
            id: trabajadoresGlobal[trabajadorIndex].id,
            username: nombre,
            email,
            empresa_id,
            imagen
        });
    } else {
        await window.api.addTrabajador({
            username: nombre,
            email,
            password: "1234",
            empresa_id,
            imagen
        });
    }

    document.getElementById("popupTrabajador").style.display = "none";
    renderTrabajadores(document.getElementById("mainContent"));
};

function cargarEmpresasEnSelect() {
    const sel = document.getElementById("trEmpresaSelect");
    if (!sel) return;

    sel.innerHTML = empresasGlobalList.map(e =>
        `<option value="${e.id}">${e.nombre}</option>`
    ).join("");
}

document.getElementById("borrarTrabajadorPreview").onclick = async () => {
    if (!trabajadorActual) return;

    if (!confirm("¿Eliminar este trabajador?")) return;

    await window.api.deleteTrabajador(trabajadorActual.id);

    trabajadoresGlobal = trabajadoresGlobal.filter(t => t.id !== trabajadorActual.id);

    document.getElementById("popupTrabajadorView").style.display = "none";
    pintarTrabajadores(trabajadoresGlobal);
};

function limpiarPopupTrabajador() {
    document.getElementById("trNombre").value = "";
    document.getElementById("trEmail").value = "";
    const sel = document.getElementById("trEmpresaSelect");
    if (sel) sel.value = "";
}

const cerrarTrabajadorViewBtn =
    document.getElementById("trabajadorViewClose") ||
    document.getElementById("trViewClose");

if (cerrarTrabajadorViewBtn) {
    cerrarTrabajadorViewBtn.onclick = () => {
        document.getElementById("popupTrabajadorView").style.display = "none";
    };
}

const cancelarTrabajadorBtn = document.getElementById("cancelarTrabajadorPopup");
if (cancelarTrabajadorBtn) {
    cancelarTrabajadorBtn.onclick = () => {
        limpiarPopupTrabajador();
        document.getElementById("popupTrabajador").style.display = "none";
    };
}

document.getElementById("trEditarBtn").onclick = () => {
    if (!trabajadorActual) return;

    trabajadorIndex = trabajadoresGlobal.findIndex(
        t => t.id === trabajadorActual.id
    );

    document.getElementById("trNombre").value = trabajadorActual.username;
    document.getElementById("trEmail").value = trabajadorActual.email;

    cargarEmpresasEnSelect();

    if (trabajadorActual.empresa_id) {
        document.getElementById("trEmpresaSelect").value = trabajadorActual.empresa_id;
    }

    document.getElementById("popupTrabajadorView").style.display = "none";
    document.getElementById("popupTrabajadorTitulo").textContent = "Editar trabajador";
    document.getElementById("popupTrabajador").style.display = "flex";
};

// ======================
// INICIO (HOME)
// ======================
function cargarInicioAdmin() {
    const main = document.getElementById("mainContent");

    main.innerHTML = `
        <h1>Panel de Administración 👑</h1>

        <!-- GRID KPI -->
        <div class="dashboard-grid">

          <div class="dash-card">
            <h3>🏢 Empresas</h3>
            <p id="dashEmpresas">0</p>
          </div>

          <div class="dash-card">
            <h3>👥 Trabajadores</h3>
            <p id="dashTrabajadores">0</p>
          </div>

          <div class="dash-card">
            <h3>👤 Clientes</h3>
            <p id="dashClientes">0</p>
          </div>

          <div class="dash-card">
            <h3>📝 Citas hoy</h3>
            <p id="dashCitasHoy">0</p>
          </div>

        </div>

        <!-- GRAFICA SEMANAL -->
        <div class="panel-box">
            <h2>📈 Citas en los últimos 7 días</h2>
            <canvas id="graficaSemanal"></canvas>
        </div>

        <!-- ALERTAS  -->
        <div class="alert-box">
            <h2>🚨 Alertas importantes</h2>
            <ul id="alertasLista"></ul>
        </div>

        <!-- ACTIVIDAD RECIENTE -->
        <div class="panel-box">
            <h2>📰 Actividad Reciente</h2>
            <div id="actividadReciente"></div>
        </div>
    `;

    cargarDashboard();
}

function cargarInicioBasico() {
    const main = document.getElementById("mainContent");

    main.innerHTML = `
        <h1>Bienvenido 👋</h1>
        <p>Selecciona una opción del menú para comenzar.</p>
    `;
}

async function cargarDashboard() {
    const empresas = await window.api.getEmpresas();
    const trabajadores = await window.api.getTrabajadores();
    const clientes = await window.api.getClientes();   // ✅ ahora viene de tabla clientes
    const citas = await window.api.getCitas("ALL");

    document.getElementById("dashEmpresas").textContent = empresas.length;
    document.getElementById("dashTrabajadores").textContent = trabajadores.length;

    // ✅ Clientes reales
    document.getElementById("dashClientes").textContent = clientes.length;

    const hoy = new Date().toISOString().split("T")[0];

    document.getElementById("dashCitasHoy").textContent =
        citas.filter(c => (c.estado || "reservado") === "reservado").length;


    cargarGraficaSemanal();
    cargarAlertas();
    cargarActividadReciente();
}





async function cargarGraficaSemanal() {

    const citas = await window.api.getCitas("ALL");

    // Últimos 7 días
    const fechas = [];
    const cantidades = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        const fechaStr = d.toISOString().split("T")[0];

        fechas.push(fechaStr);
        cantidades.push(
            citas.filter(c => c.fecha === fechaStr).length
        );
    }

    new Chart(document.getElementById("graficaSemanal"), {
        type: "line",
        data: {
            labels: fechas,
            datasets: [{
                label: "Citas",
                data: cantidades,
                borderWidth: 2,
                fill: false,
                tension: 0.3
            }]
        }
    });
}


async function cargarAlertas() {
    const lista = document.getElementById("alertasLista");
    lista.innerHTML = "";

    const empresas = await window.api.getEmpresas();
    const trabajadores = await window.api.getTrabajadores();
    const citas = await window.api.getCitas("ALL");

    let alertas = [];

    // 1️⃣ Trabajadores sin empresa
    const trabajadoresSinEmpresa = trabajadores.filter(t => {
        return (
            t.empresa_id === null ||
            t.empresa_id === undefined ||
            t.empresa_id === "" ||
            !empresas.some(emp => emp.id === t.empresa_id)
        );
    });

    if (trabajadoresSinEmpresa.length > 0) {
        alertas.push(`${trabajadoresSinEmpresa.length} trabajadores sin empresa asignada`);
    }

    // 2️⃣ Empresas sin trabajadores
    empresas.forEach(emp => {
        const cuenta = trabajadores.filter(t => t.empresa_id === emp.id).length;
        if (cuenta === 0) {
            alertas.push(`La empresa "${emp.nombre}" no tiene trabajadores.`);
        }
    });

    // 3️⃣ Citas pasadas sin nota
    const hoy = new Date().toISOString().split("T")[0];
    const citasPasadasSinNota = citas.filter(c =>
        c.fecha < hoy && (!c.nota || c.nota.trim() === "")
    );

    if (citasPasadasSinNota.length > 0) {
        alertas.push(`${citasPasadasSinNota.length} citas pasadas no tienen nota añadida.`);
    }


    // --- SI NO HAY ALERTAS ---
    if (alertas.length === 0) {
        lista.innerHTML = `<p>No hay alertas importantes 🎉</p>`;
        return;
    }

    // --- PINTAR ALERTAS ---
    lista.innerHTML = alertas
        .map(a => `<div class="alert-item">⚠️ ${a}</div>`)
        .join("");
}



async function cargarActividadReciente() {
    const citas = await window.api.getCitas("ALL");

    // ya vienen ordenadas por updated_at/created_at DESC desde main.js
    const ultimas = citas.slice(0, 10);

    const actividades = ultimas.map(c => {
        const estado = (c.estado || "reservado").toLowerCase();
        const when = c.updated_at || c.created_at || c.fecha;

        let texto = `📅 Cita creada: ${c.cliente || "—"} (${c.fecha} - ${c.hora})`;

        if (estado === "cancelada") {
            texto = `🚫 Cita cancelada: ${c.cliente || "—"} (${c.fecha} - ${c.hora})`;
        }
        if (estado === "completada") {
            texto = `✅ Cita completada: ${c.cliente || "—"} (${c.fecha} - ${c.hora})`;
        }

        return { texto, when };
    });

    const div = document.getElementById("actividadReciente");

    div.innerHTML = actividades.map(a => `
    <div class="item">
      <div>${a.texto}</div>
      <div class="fecha">${a.when}</div>
    </div>
  `).join("");
}


// ======================
// SUBMENÚ ADMIN
// ======================
const adminToggleBtn = document.getElementById("adminToggleBtn");
const adminSubmenu = document.getElementById("adminSubmenu");

if (adminToggleBtn && adminSubmenu) {
    adminToggleBtn.addEventListener("click", () => {
        const visible = adminSubmenu.style.display === "flex";
        adminSubmenu.style.display = visible ? "none" : "flex";
        adminToggleBtn.textContent = visible
            ? "⚙️ Administración avanzada ▾"
            : "⚙️ Administración avanzada ▴";
    });
}


async function renderCitas(main) {
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");

    let citas = [];
    let empresas = [];
    let trabajadores = [];

    if (role === "trabajador") {
        // 🔒 trabajador → SOLO sus citas
        citas = await window.api.getCitasTrabajador({
            trabajador_id: userId
        });

        // solo necesita SU empresa y él mismo
        trabajadores = await window.api.getTrabajadores();
        empresas = await window.api.getEmpresas();

    } else {
        // 👑 admin
        citas = await window.api.getCitas("ALL");
        empresas = await window.api.getEmpresas();
        trabajadores = await window.api.getTrabajadores();
    }

    main.innerHTML = `
    <h1>Citas 📝</h1>

    <div style="display:flex; gap:10px; flex-wrap:wrap; margin: 15px 0;">
      <input id="fFecha" type="date" style="padding:10px; border-radius:8px; border:1px solid #ddd;">
      
      <select id="fEstado" style="padding:10px; border-radius:8px; border:1px solid #ddd;">
        <option value="">Todos los estados</option>
        <option value="reservado">Reservado</option>
        <option value="cancelada">Cancelada</option>
        <option value="completada">Completada</option>
      </select>

      <select id="fEmpresa" style="padding:10px; border-radius:8px; border:1px solid #ddd;">
        <option value="">Todas las empresas</option>
        ${empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join("")}
      </select>

      <select id="fTrabajador" style="padding:10px; border-radius:8px; border:1px solid #ddd;">
        <option value="">Todos los trabajadores</option>
        ${trabajadores.map(t => `<option value="${t.id}">${t.username}</option>`).join("")}
      </select>

      <input id="fTexto" placeholder="Buscar cliente..." style="padding:10px; border-radius:8px; border:1px solid #ddd;">
    </div>

    <div style="overflow:auto; background:white; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.06);">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6; text-align:left;">
            <th style="padding:12px;">Fecha</th>
            <th style="padding:12px;">Hora</th>
            <th style="padding:12px;">Cliente</th>
            <th style="padding:12px;">Teléfono</th>
            <th style="padding:12px;">Estado</th>
            <th style="padding:12px;">Empresa</th>
            <th style="padding:12px;">Trabajador</th>
            <th style="padding:12px;">Acciones</th>
          </tr>
        </thead>
        <tbody id="tablaCitasBody"></tbody>
      </table>
    </div>
  `;

    if (role === "trabajador") {
        const fEmpresa = document.getElementById("fEmpresa");
        const fTrabajador = document.getElementById("fTrabajador");
        if (fEmpresa) fEmpresa.style.display = "none";
        if (fTrabajador) fTrabajador.style.display = "none";
    }

    const body = document.getElementById("tablaCitasBody");

    function nombreEmpresa(id) {
        return empresas.find(e => String(e.id) === String(id))?.nombre || "—";
    }
    function nombreTrabajador(id) {
        return trabajadores.find(t => String(t.id) === String(id))?.username || "—";
    }
    function badgeEstado(estado) {
        const e = estado || "reservado";
        const styles =
            e === "cancelada" ? "background:#e5e7eb;color:#374151;" :
                e === "completada" ? "background:#dcfce7;color:#166534;" :
                    "background:#fee2e2;color:#991b1b;";
        return `<span style="padding:6px 10px; border-radius:999px; font-size:12px; ${styles}">${e}</span>`;
    }

    function pintar(lista) {
        body.innerHTML = "";

        if (lista.length === 0) {
            body.innerHTML = `<tr><td colspan="8" style="padding:14px;">No hay citas con esos filtros.</td></tr>`;
            return;
        }

        lista
            .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
            .forEach(c => {
                const empresaId = c.empresa_id ?? c.empresaId;
                const trabajadorId = c.trabajador_id ?? c.userId;

                const tr = document.createElement("tr");
                tr.innerHTML = `
          <td style="padding:12px; border-top:1px solid #eee;">${c.fecha}</td>
          <td style="padding:12px; border-top:1px solid #eee;">${c.hora}</td>
          <td style="padding:12px; border-top:1px solid #eee;">${c.cliente || ""}</td>
          <td style="padding:12px; border-top:1px solid #eee;">${c.telefono || ""}</td>
          <td style="padding:12px; border-top:1px solid #eee;">${badgeEstado(c.estado)}</td>
          <td style="padding:12px; border-top:1px solid #eee;">${nombreEmpresa(empresaId)}</td>
          <td style="padding:12px; border-top:1px solid #eee;">${nombreTrabajador(trabajadorId)}</td>
          <td style="padding:12px; border-top:1px solid #eee; display:flex; gap:6px; flex-wrap:wrap;">
            <button data-id="${c.id}" data-accion="completar">✅</button>
            <button data-id="${c.id}" data-accion="cancelar">🚫</button>
            <button data-id="${c.id}" data-accion="borrar">🗑️</button>
          </td>
        `;
                body.appendChild(tr);
            });

        // acciones
        body.querySelectorAll("button").forEach(btn => {
            btn.style.border = "1px solid #ddd";
            btn.style.borderRadius = "8px";
            btn.style.padding = "6px 10px";
            btn.style.cursor = "pointer";
            btn.onclick = async () => {
                const id = btn.getAttribute("data-id");
                const accion = btn.getAttribute("data-accion");

                if (accion === "completar") {
                    await window.api.setCitaEstado({ id, estado: "completada" });
                }
                if (accion === "cancelar") {
                    await window.api.setCitaEstado({ id, estado: "cancelada" });
                }
                if (accion === "borrar") {
                    if (!confirm("¿Eliminar definitivamente la cita?")) return;
                    await window.api.deleteCita(id);
                }

                // recargar lista
                const nuevas = await window.api.getCitas("ALL");
                aplicarFiltros(nuevas);
            };
        });
    }

    function aplicarFiltros(lista) {
        const fFecha = document.getElementById("fFecha").value;
        const fEstado = document.getElementById("fEstado").value;
        const fEmpresa = document.getElementById("fEmpresa").value;
        const fTrabajador = document.getElementById("fTrabajador").value;
        const fTexto = document.getElementById("fTexto").value.toLowerCase();

        const filtrada = lista.filter(c => {
            const empresaId = String(c.empresa_id ?? c.empresaId ?? "");
            const trabajadorId = String(c.trabajador_id ?? c.userId ?? "");
            const estado = c.estado || "reservado";

            if (fFecha && c.fecha !== fFecha) return false;
            if (fEstado && estado !== fEstado) return false;
            if (fEmpresa && empresaId !== String(fEmpresa)) return false;
            if (fTrabajador && trabajadorId !== String(fTrabajador)) return false;
            if (fTexto && !(c.cliente || "").toLowerCase().includes(fTexto)) return false;

            return true;
        });

        pintar(filtrada);
    }

    // listeners filtros
    ["fFecha", "fEstado", "fEmpresa", "fTrabajador", "fTexto"].forEach(id => {
        document.getElementById(id).addEventListener("input", async () => {
            const nuevas = await window.api.getCitas("ALL");
            aplicarFiltros(nuevas);
        });
    });

    // primera pinta
    pintar(citas);

}
// ======================
// AJUSTES (CON BD + 3 TABLAS)
// Requiere en preload:
//   updateProfile: (data) => ipcRenderer.invoke("update-profile", data)
//   updatePassword: (data) => ipcRenderer.invoke("update-password", data)
// ======================
async function renderAjustes(main) {

    // ----------------------
    // Helpers UI
    // ----------------------
    function escapeHtml(str = "") {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function inputStyle() {
        return `
      width:100%;
      padding:10px 12px;
      border-radius:10px;
      border:1px solid #e5e7eb;
      outline:none;
      background:#fff;
    `;
    }

    function btnPrimary() {
        return `
      padding:10px 14px;
      border-radius:10px;
      border:0;
      background:#2563eb;
      color:white;
      cursor:pointer;
      font-weight:600;
    `;
    }

    function btnGhost() {
        return `
      padding:10px 14px;
      border-radius:10px;
      border:1px solid #e5e7eb;
      background:#fff;
      cursor:pointer;
      font-weight:600;
    `;
    }

    function btnDanger() {
        return `
      padding:10px 14px;
      border-radius:10px;
      border:0;
      background:#dc2626;
      color:white;
      cursor:pointer;
      font-weight:700;
    `;
    }

    function pintarAvatar(imagen, nombre) {
        const cont = document.getElementById("ajustesAvatar");
        if (!cont) return;

        if (imagen) {
            cont.innerHTML = `<img src="${imagen}" style="width:100%;height:100%;object-fit:cover;">`;
            return;
        }

        const inicial = (nombre?.trim()?.[0] || "?").toUpperCase();
        cont.textContent = inicial;
    }

    async function fileToBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    // ----------------------
    // Datos sesión
    // ----------------------
    const userId = localStorage.getItem("userId"); // importante
    const role = (localStorage.getItem("role") || "cliente").toLowerCase();

    const username = localStorage.getItem("username") || "";
    const email = localStorage.getItem("email") || "";
    const imagen = localStorage.getItem("imagen") || "";

    const empresaSel = localStorage.getItem("seleccion_empresa") || "";
    const trabajadorSel = localStorage.getItem("seleccion_trabajador") || "";

    // Preferencias (local)
    const prefTema = localStorage.getItem("pref_tema") || "claro"; // claro | oscuro
    const prefNotifs = localStorage.getItem("pref_notifs") || "si"; // si | no
    const prefFormatoHora = localStorage.getItem("pref_formato_hora") || "24"; // 24 | 12

    // ----------------------
    // UI
    // ----------------------
    main.innerHTML = `
    <h1 class="title-page">Ajustes ⚙️</h1>

    <div style="display:grid; gap:16px; max-width:900px;">

      <!-- PERFIL -->
      <div style="background:white; border-radius:14px; padding:16px; box-shadow:0 4px 10px rgba(0,0,0,.06);">
        <h2 style="margin-bottom:10px;">👤 Perfil</h2>

        <div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap;">
          <div id="ajustesAvatar" style="
              width:70px; height:70px; border-radius:999px;
              background:#e5e7eb; display:flex; align-items:center; justify-content:center;
              overflow:hidden; font-size:26px; font-weight:700; color:#111827;
          "></div>

          <div style="flex:1; min-width:260px;">
            <div style="display:grid; gap:10px;">
              <label>
                <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Usuario</div>
                <input id="aj_username" value="${escapeHtml(username)}" style="${inputStyle()}" />
              </label>

              <label>
                <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Email</div>
                <input id="aj_email" value="${escapeHtml(email)}" style="${inputStyle()}" />
              </label>

              <label>
                <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Foto (opcional)</div>
                <input id="aj_imagen" type="file" accept="image/*" style="width:100%;" />
              </label>

              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button id="btnGuardarPerfil" style="${btnPrimary()}">Guardar perfil</button>
                <button id="btnQuitarFoto" style="${btnGhost()}">Quitar foto</button>
              </div>

              <div style="font-size:12px; color:#6b7280;">
                Rol actual: <b>${escapeHtml(role)}</b>
              </div>

              <div id="perfilMsg" style="font-size:13px; margin-top:6px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- SEGURIDAD -->
      <div style="background:white; border-radius:14px; padding:16px; box-shadow:0 4px 10px rgba(0,0,0,.06);">
        <h2 style="margin-bottom:10px;">🔒 Seguridad</h2>

        <div style="display:grid; gap:10px; max-width:520px;">
          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Contraseña actual</div>
            <input id="aj_oldPass" type="password" placeholder="********" style="${inputStyle()}" />
          </label>

          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Nueva contraseña</div>
            <input id="aj_newPass1" type="password" placeholder="********" style="${inputStyle()}" />
          </label>

          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Repetir nueva contraseña</div>
            <input id="aj_newPass2" type="password" placeholder="********" style="${inputStyle()}" />
          </label>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button id="btnCambiarPass" style="${btnPrimary()}">Cambiar contraseña</button>
            <button id="btnMostrarPass" style="${btnGhost()}">Mostrar / Ocultar</button>
          </div>

          <div id="passMsg" style="font-size:13px;"></div>
        </div>
      </div>

      <!-- PREFERENCIAS -->
      <div style="background:white; border-radius:14px; padding:16px; box-shadow:0 4px 10px rgba(0,0,0,.06);">
        <h2 style="margin-bottom:10px;">🎛️ Preferencias</h2>

        <div style="display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">

          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Notificaciones</div>
            <select id="aj_notifs" style="${inputStyle()}">
              <option value="si" ${prefNotifs === "si" ? "selected" : ""}>Activadas</option>
              <option value="no" ${prefNotifs === "no" ? "selected" : ""}>Desactivadas</option>
            </select>
          </label>

          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Formato de hora</div>
            <select id="aj_formatoHora" style="${inputStyle()}">
              <option value="24" ${prefFormatoHora === "24" ? "selected" : ""}>24h</option>
              <option value="12" ${prefFormatoHora === "12" ? "selected" : ""}>12h</option>
            </select>
          </label>
        </div>

        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <button id="btnGuardarPrefs" style="${btnPrimary()}">Guardar preferencias</button>
          <button id="btnResetPrefs" style="${btnGhost()}">Restablecer</button>
        </div>

        <div id="prefsMsg" style="font-size:13px; margin-top:10px;"></div>
      </div>

      <!-- SESIÓN / DATOS -->
      <div style="background:white; border-radius:14px; padding:16px; box-shadow:0 4px 10px rgba(0,0,0,.06);">
        <h2 style="margin-bottom:10px;">🧾 Sesión y datos</h2>

        <div style="display:grid; gap:10px;">
          <div style="font-size:13px; color:#374151;">
            • Empresa seleccionada: <b>${escapeHtml(empresaSel || "—")}</b><br>
            • Trabajador seleccionado: <b>${escapeHtml(trabajadorSel || "—")}</b>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button id="btnLimpiarSeleccion" style="${btnGhost()}">Limpiar selección (empresa/trabajador)</button>
            <button id="btnBorrarLocal" style="${btnGhost()}">Borrar preferencias locales</button>
            <button id="btnCerrarSesion" style="${btnDanger()}">Cerrar sesión</button>
          </div>

          <div style="font-size:12px; color:#6b7280;">
            Usuario ID: <b>${escapeHtml(userId || "—")}</b>
          </div>
        </div>
      </div>

    </div>
  `;

    // Avatar
    pintarAvatar(imagen, username);

    // ----------------------
    // PERFIL -> guardar en BD + localStorage
    // ----------------------
    const perfilMsg = document.getElementById("perfilMsg");

    document.getElementById("btnGuardarPerfil").onclick = async () => {
        try {
            if (!userId) {
                alert("❌ No hay sesión iniciada.");
                return;
            }

            const newUser = document.getElementById("aj_username").value.trim();
            const newEmail = document.getElementById("aj_email").value.trim();
            const file = document.getElementById("aj_imagen").files?.[0];

            if (!newUser) return alert("El usuario no puede estar vacío.");

            // imagen -> base64 (si hay)
            let newImagen = localStorage.getItem("imagen") || "";
            if (file) newImagen = await fileToBase64(file);

            // 🔥 BD
            if (!window.api?.updateProfile) {
                alert("❌ Falta window.api.updateProfile en preload.js");
                return;
            }

            const res = await window.api.updateProfile({
                role,
                id: userId,
                username: newUser,
                email: newEmail,
                imagen: newImagen
            });

            if (!res?.success) {
                perfilMsg.textContent = "❌ " + (res?.message || "No se pudo guardar.");
                perfilMsg.style.color = "#b91c1c";
                return;
            }

            // ✅ actualizar localStorage
            localStorage.setItem("username", newUser);
            localStorage.setItem("email", newEmail);
            localStorage.setItem("imagen", newImagen);

            // ✅ refrescar UI
            pintarAvatar(newImagen, newUser);
            loadSidebarAvatar?.();

            // ✅ header
            const uName = document.getElementById("userName");
            const uEmail = document.getElementById("userEmail");
            if (uName) uName.textContent = newUser;
            if (uEmail) uEmail.textContent = newEmail;

            perfilMsg.textContent = "✅ Perfil guardado correctamente.";
            perfilMsg.style.color = "#15803d";

        } catch (e) {
            console.error(e);
            perfilMsg.textContent = "❌ Error guardando perfil. Mira consola (F12).";
            perfilMsg.style.color = "#b91c1c";
        }
    };

    document.getElementById("btnQuitarFoto").onclick = async () => {
        try {
            if (!userId) {
                alert("❌ No hay sesión iniciada.");
                return;
            }

            // quitar de BD y local
            if (!window.api?.updateProfile) {
                alert("❌ Falta window.api.updateProfile en preload.js");
                return;
            }

            const res = await window.api.updateProfile({
                role,
                id: userId,
                username: localStorage.getItem("username") || "",
                email: localStorage.getItem("email") || "",
                imagen: "" // quitar
            });

            if (!res?.success) {
                alert("❌ No se pudo quitar la foto.");
                return;
            }

            localStorage.removeItem("imagen");
            pintarAvatar("", localStorage.getItem("username") || "");
            loadSidebarAvatar?.();

            perfilMsg.textContent = "✅ Foto eliminada.";
            perfilMsg.style.color = "#15803d";
        } catch (e) {
            console.error(e);
            alert("❌ Error quitando foto.");
        }
    };

    // ----------------------
    // SEGURIDAD -> update-password (BD)
    // ----------------------
    let passVisible = false;
    const passMsg = document.getElementById("passMsg");

    document.getElementById("btnMostrarPass").onclick = () => {
        passVisible = !passVisible;
        document.getElementById("aj_oldPass").type = passVisible ? "text" : "password";
        document.getElementById("aj_newPass1").type = passVisible ? "text" : "password";
        document.getElementById("aj_newPass2").type = passVisible ? "text" : "password";
    };

    document.getElementById("btnCambiarPass").onclick = async () => {
        try {
            if (!userId) {
                alert("❌ No hay sesión iniciada.");
                return;
            }

            const oldPass = document.getElementById("aj_oldPass").value.trim();
            const p1 = document.getElementById("aj_newPass1").value.trim();
            const p2 = document.getElementById("aj_newPass2").value.trim();

            passMsg.textContent = "";
            passMsg.style.color = "#111827";

            if (!oldPass || !p1 || !p2) {
                passMsg.textContent = "⚠️ Completa todos los campos.";
                passMsg.style.color = "#b91c1c";
                return;
            }

            if (p1 !== p2) {
                passMsg.textContent = "⚠️ Las nuevas contraseñas no coinciden.";
                passMsg.style.color = "#b91c1c";
                return;
            }

            if (p1.length < 6) {
                passMsg.textContent = "⚠️ La nueva contraseña debe tener al menos 6 caracteres.";
                passMsg.style.color = "#b91c1c";
                return;
            }

            if (!window.api?.updatePassword) {
                alert("❌ Falta window.api.updatePassword en preload.js");
                return;
            }

            const res = await window.api.updatePassword({
                role,
                id: userId,
                oldPassword: oldPass,
                newPassword: p1
            });

            if (!res?.success) {
                passMsg.textContent = "❌ " + (res?.message || "No se pudo cambiar.");
                passMsg.style.color = "#b91c1c";
                return;
            }

            document.getElementById("aj_oldPass").value = "";
            document.getElementById("aj_newPass1").value = "";
            document.getElementById("aj_newPass2").value = "";

            passMsg.textContent = "✅ Contraseña actualizada correctamente.";
            passMsg.style.color = "#15803d";

        } catch (e) {
            console.error(e);
            passMsg.textContent = "❌ Error cambiando contraseña. Mira consola (F12).";
            passMsg.style.color = "#b91c1c";
        }
    };

    // ----------------------
    // Preferencias (local)
    // ----------------------
    const prefsMsg = document.getElementById("prefsMsg");

    document.getElementById("btnGuardarPrefs").onclick = () => {
        localStorage.setItem("pref_notifs", aj_notifs.value);
        localStorage.setItem("pref_formato_hora", aj_formatoHora.value);
        alert("✅ Preferencias guardadas.");
    };

    // ----------------------
    // Sesión / datos
    // ----------------------
    document.getElementById("btnLimpiarSeleccion").onclick = () => {
        localStorage.removeItem("seleccion_empresa");
        localStorage.removeItem("seleccion_trabajador");
        alert("✅ Selección eliminada.");
        renderAjustes(main);
    };

    document.getElementById("btnBorrarLocal").onclick = () => {
        ["pref_tema", "pref_notifs", "pref_formato_hora"].forEach(k => localStorage.removeItem(k));
        alert("✅ Preferencias locales borradas.");
        renderAjustes(main);
    };

    document.getElementById("btnCerrarSesion").onclick = () => logout();
}



// ======================
// LOGOUT
// ======================
function logout() {
    localStorage.clear();
    window.location.href = "../index.html";
}
window.logout = logout; // por si acaso

// ======================
// CARGA INICIAL
// ======================
if (role === "admin") {
    cargarInicioAdmin();
} else {
    cargarInicioBasico();
}
