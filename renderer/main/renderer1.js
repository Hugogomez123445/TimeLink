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
            main.innerHTML = "<h1>Citas 📝</h1><p>Gestión de citas próximamente.</p>";
            break;

        case "ajustes":
            main.innerHTML = "<h1>Ajustes ⚙️</h1><p>Configuraciones del usuario.</p>";
            break;

        case "adminPanel":
            renderAdminPanel(main);
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

      eventClick(info) {
        const ev = info.event;

        const editar = confirm("Aceptar = Editar\nCancelar = Eliminar");
        if (editar) openEditPopup(ev);
        else deleteEvent(ev);
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
        const okEmp  = empresaId ? String(eId) === String(empresaId) : true;
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
        .filter(ev => ev.start.toISOString().split("T")[0] === dateStr)
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
    };

    document.getElementById("cancelarPopup").onclick = () => {
      document.getElementById("popupCita").style.display = "none";
    };

  }, 50);
}

// =========================
// Pintar cita en calendario (SIEMPRE ROJO)
// =========================
function addCitaToCalendar(c) {
  if (!calendar) return;

  const id = c.id ?? c.cita_id ?? c.citaId;

  const start =
    (c.hora && c.hora.length === 5)
      ? `${c.fecha}T${c.hora}:00`
      : `${c.fecha}T${c.hora}`;

  calendar.addEvent({
    title: c.cliente || "Reservado",
    start,
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
    extendedProps: { ...c, id }
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

    setTimeout(async () => {
        const listaDiv = document.getElementById("clientesListaInner");
        const contenidoDiv = document.getElementById("clienteCitasContenido");
        const tituloCliente = document.getElementById("clienteTitulo");

        const citas = await window.api.getCitas("ALL");
        const porCliente = {};

        citas.forEach(c => {
            if (!porCliente[c.cliente]) porCliente[c.cliente] = [];
            porCliente[c.cliente].push(c);
        });

        Object.keys(porCliente).forEach(nombre => {
            const item = document.createElement("div");
            item.className = "cliente-item";
            item.textContent = nombre;

            item.onclick = () => {
                tituloCliente.textContent = `Citas de ${nombre}`;

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

                porCliente[nombre].forEach(c => {
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
    }, 60);
}

// ======================
// PANEL ADMIN (para trabajadores / admin)
// ======================
function renderAdminPanel(main) {
    if (role !== "trabajador" && role !== "admin") {
        main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
        return;
    }

    main.innerHTML = `
        <h1>Panel de Administración ⭐</h1>

        <div class="admin-panel-buttons">

            <div class="admin-card">
                <h3>Usuarios 👤</h3>
                <p>Gestión de usuarios.</p>
                <button onclick="navigate('adminUsuarios')">Abrir</button>
            </div>

            <div class="admin-card">
                <h3>Citas 📅</h3>
                <p>Gestionar todas las citas.</p>
                <button onclick="navigate('adminCitas')">Abrir</button>
            </div>

        </div>
    `;
}

// ======================
// ADMIN - USUARIOS
// ======================
async function renderAdminUsuarios(main) {
    const usuarios = await window.api.getAllUsers();

    main.innerHTML = `
        <h1>Gestión de Usuarios 👥</h1>

        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                </tr>
            </thead>

            <tbody id="tablaUsuarios"></tbody>
        </table>
    `;

    const tbody = document.getElementById("tablaUsuarios");

    usuarios.forEach(u => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${u.id}</td>
            <td>${u.username}</td>
            <td>${u.email}</td>

            <td>
                <select data-user-id="${u.id}">
                    <option value="cliente" ${u.role === "cliente" ? "selected" : ""}>Cliente</option>
                    <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
                    <option value="trabajador" ${u.role === "trabajador" ? "selected" : ""}>Trabajador</option>
                </select>
            </td>

            <td>
                <button data-del="${u.id}" class="btn-danger">Eliminar</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    tbody.querySelectorAll("select").forEach(sel => {
        sel.onchange = async () => {
            await window.api.updateUserRole({
                id: sel.getAttribute("data-user-id"),
                role: sel.value
            });
            alert("Rol actualizado correctamente");
        };
    });

    tbody.querySelectorAll("button[data-del]").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("¿Eliminar este usuario?")) return;
            await window.api.deleteUser(btn.getAttribute("data-del"));
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

        <div class="trabajador-toolbar">
            <button class="btn-primary add-empresa-btn" onclick="nuevoTrabajador()">
                ➕ Añadir trabajador
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
    const clientes = await window.api.getAllUsers();
    const citas = await window.api.getCitas("ALL");

    document.getElementById("dashEmpresas").textContent = empresas.length;
    document.getElementById("dashTrabajadores").textContent = trabajadores.length;
    document.getElementById("dashClientes").textContent =
        clientes.filter(u => u.role === "cliente").length;

    document.getElementById("dashCitasHoy").textContent =
        citas.filter(c => c.fecha === new Date().toISOString().split("T")[0]).length;

    // 🔥 cargar módulos extra
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
    const actividades = [];

    citas.slice(-10).reverse().forEach(c => {
        actividades.push({
            texto: `📅 Cita creada por ${c.cliente} (${c.fecha} - ${c.hora})`,
            fecha: c.fecha
        });
    });

    const div = document.getElementById("actividadReciente");

    div.innerHTML = actividades.map(a => `
        <div class="item">
            <div>${a.texto}</div>
            <div class="fecha">${a.fecha}</div>
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
