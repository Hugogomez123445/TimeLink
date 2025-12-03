// ========================================================
// Sección: Variables, roles, navegación, calendario y popups
// ========================================================

// ========================================================
// OBTENER DATOS DEL USUARIO
// ========================================================
const userId = localStorage.getItem("userId");
const role = localStorage.getItem("role") || "cliente";
const username = localStorage.getItem("username") || "Usuario";
const userEmail = localStorage.getItem("email") || "email@example.com";

// Rellenar info del header
document.getElementById("userName").textContent = username;
document.getElementById("userEmail").textContent = userEmail;

// ========================================================
// CONTROL DE PERMISOS SEGÚN ROL
// ========================================================
if (role === "cliente") {
    document.getElementById("btnTrabajadores").style.display = "none";
    document.getElementById("btnEmpresas").style.display = "none";
}

else if (role === "trabajador") {
    document.getElementById("btnTrabajadores").style.display = "none";
    document.getElementById("btnEmpresas").style.display = "none";
}

else if (role === "admin") {
    document.getElementById("btnCalendario").style.display = "none";
    document.getElementById("btnClientes").style.display = "none";
    document.getElementById("btnCitas").style.display = "none";
    document.getElementById("adminPanelBtn").style.display = "none";

    document.getElementById("btnTrabajadores").style.display = "block";
    document.getElementById("btnEmpresas").style.display = "block";
}

// Submenú solo admin
document.getElementById("submenuAdminContainer").style.display =
    role === "admin" ? "block" : "none";

// Mostrar panel admin a trabajadores
if (role === "trabajador") {
    document.getElementById("adminPanelBtn").style.display = "block";
}

// ========================================================
// VARIABLES GLOBALES (Calendario, Popups)
// ========================================================
let calendar = null;
let popupFecha = "";
let popupHora = "";
let isEditing = false;
let editingEvent = null;
let editingId = null;

// ========================================================
// NAVEGACIÓN PRINCIPAL
// ========================================================
function navigate(section) {
    const main = document.getElementById("mainContent");
    const buttons = document.querySelectorAll(".menu button");

    buttons.forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");

    switch (section) {
        case "inicio":
            main.innerHTML = "<h1>Inicio 🏠</h1><p>Bienvenido a TimeLink.</p>";
            break;

        case "calendario": renderCalendario(main); break;
        case "clientes": renderClientes(main); break;
        case "ajustes":
            main.innerHTML = "<h1>Ajustes ⚙️</h1><p>Configuraciones del usuario.</p>";
            break;

        case "citas":
            main.innerHTML = "<h1>Citas 📝</h1><p>Gestión de citas próximamente.</p>";
            break;

        case "adminPanel": renderAdminPanel(main); break;
        case "adminUsuarios": renderAdminUsuarios(main); break;
        case "adminCitas": renderAdminCitas(main); break;
        case "trabajadores": renderTrabajadores(main); break;
        case "empresas": renderEmpresas(main); break;
    }
}

// ========================================================
// CALENDARIO - RENDER COMPLETO
// ========================================================
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

        // Crear calendario
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
                hourPanel.style.display = "none";
                generateHours(info.dateStr);
            },

            eventClick(info) {
                const ev = info.event;
                const evUserId = ev.extendedProps.userId;

                // Clientes no pueden tocar citas ajenas
                if (role !== "admin" && String(evUserId) !== String(userId)) {
                    alert("No puedes modificar citas de otros clientes.");
                    return;
                }

                const editar = confirm("Aceptar = Editar la cita\nCancelar = Eliminar la cita");

                if (editar) openEditPopup(ev);
                else deleteEvent(ev);
            }
        });

        calendar.render();

        // Cargar citas
        const citas = await window.api.getCitas("ALL");
        citas.forEach(c => addCitaToCalendar(c));

        // ============================
        // Generar horas disponibles
        // ============================
        function generateHours(dateStr) {
            hourList.innerHTML = "";
            hourPanel.style.display = "block";

            const occupied = calendar.getEvents()
                .filter(ev => ev.start.toISOString().split("T")[0] === dateStr)
                .map(ev => ev.start.toTimeString().slice(0, 5));

            for (let min = 9 * 60; min <= 18 * 60; min += 30) {
                const h = String(Math.floor(min / 60)).padStart(2, "0");
                const m = String(min % 60).padStart(2, "0");
                const hourText = `${h}:${m}`;

                const btn = document.createElement("button");
                btn.className = "hour-btn";
                btn.textContent = hourText;

                if (occupied.includes(hourText)) {
                    btn.classList.add("busy");
                    btn.disabled = true;
                } else {
                    btn.classList.add("free");
                    btn.onclick = () => openNewCitaPopup(dateStr, hourText);
                }

                hourList.appendChild(btn);
            }
        }

        // ============================
        // POPUP NUEVA CITA
        // ============================
        function openNewCitaPopup(date, hour) {
            isEditing = false;
            editingEvent = null;
            editingId = null;

            popupFecha = date;
            popupHora = hour;

            document.getElementById("citaCliente").value = username;
            document.getElementById("citaTelefono").value = "";
            document.getElementById("citaNota").value = "";
            document.getElementById("popupTitulo").textContent = "Nueva cita";

            document.getElementById("popupCita").style.display = "flex";
        }

        // ============================
        // EDITAR CITA
        // ============================
        function openEditPopup(ev) {
            isEditing = true;
            editingEvent = ev;
            editingId = ev.extendedProps.id;

            const ext = ev.extendedProps;

            popupFecha = ev.start.toISOString().split("T")[0];
            popupHora = ev.start.toTimeString().slice(0, 5);

            document.getElementById("citaCliente").value = ext.cliente || ev.title;
            document.getElementById("citaTelefono").value = ext.telefono || "";
            document.getElementById("citaNota").value = ext.nota || "";

            document.getElementById("popupTitulo").textContent = "Editar cita";
            document.getElementById("popupCita").style.display = "flex";
        }

        // ============================
        // ELIMINAR CITA
        // ============================
        async function deleteEvent(ev) {
            if (confirm("¿Eliminar esta cita?")) {
                await window.api.deleteCita(ev.extendedProps.id);
                ev.remove();
            }
        }

    }, 50);
}

// ========================================================
// AÑADIR EVENTO VISUAL AL CALENDARIO
// ========================================================
function addCitaToCalendar(c) {
    if (!calendar) return;

    const esPropia = String(c.userId) === String(userId);

    calendar.addEvent({
        title: role === "admin"
            ? `${c.cliente} (${c.username})`
            : esPropia ? c.cliente : "Ocupado",

        start: `${c.fecha}T${c.hora}`,
        backgroundColor: esPropia ? "#2563eb" : "#dc2626",
        borderColor: esPropia ? "#2563eb" : "#dc2626",
        extendedProps: {
            id: c.id,
            cliente: c.cliente,
            telefono: c.telefono,
            nota: c.nota,
            username: c.username,
            userId: c.userId
        }
    });
}

// ========================================================
// POPUP GUARDAR / CANCELAR CITA
// ========================================================
document.getElementById("cancelarPopup").onclick = () =>
    document.getElementById("popupCita").style.display = "none";

document.getElementById("guardarPopup").onclick = async () => {

    const cliente = document.getElementById("citaCliente").value;
    const telefono = document.getElementById("citaTelefono").value;
    const nota = document.getElementById("citaNota").value;

    if (!cliente || !popupFecha || !popupHora) {
        alert("Faltan datos.");
        return;
    }

    if (isEditing && editingId) {

        await window.api.updateCita({
            id: editingId,
            fecha: popupFecha,
            hora: popupHora,
            cliente,
            telefono,
            nota,
            estado: "reservado"
        });

        if (editingEvent) {
            editingEvent.setStart(`${popupFecha}T${popupHora}:00`);
            editingEvent.setProp("title", cliente);
            editingEvent.setExtendedProp("cliente", cliente);
            editingEvent.setExtendedProp("telefono", telefono);
            editingEvent.setExtendedProp("nota", nota);
        }

    } else {

        const nueva = await window.api.addCita({
            fecha: popupFecha,
            hora: popupHora,
            cliente,
            telefono,
            nota,
            estado: "reservado",
            userId,
            username
        });

        addCitaToCalendar({
            id: nueva.id,
            fecha: popupFecha,
            hora: popupHora,
            cliente,
            telefono,
            nota,
            username,
            userId
        });
    }

    document.getElementById("popupCita").style.display = "none";
};


// ========================================================
// Sección: Clientes, Panel Admin, Usuarios, Citas y Trabajadores
// ========================================================


// ========================================================
// CLIENTES (solo Admin / Trabajador)
// ========================================================
async function renderClientes(main) {

    if (role !== "admin" && role !== "trabajador") {
        main.innerHTML = `<h1>Acceso denegado 🔒</h1>`;
        return;
    }

    main.innerHTML = `
        <h1>Clientes 👤</h1>

        <div class="clientes-layout">

            <!-- Lista de clientes -->
            <div class="clientes-card">
                <h3>Lista de clientes</h3>
                <p class="sub">Selecciona un cliente para ver sus citas.</p>
                <div id="clientesListaInner"></div>
            </div>

            <!-- Citas del cliente -->
            <div class="clientes-card cliente-citas">
                <h3 id="clienteTitulo">Citas del cliente</h3>
                <div id="clienteCitasContenido" class="cliente-citas-contenido">
                    Aún no has seleccionado ningún cliente.
                </div>
            </div>

        </div>
    `;

    // Esperar DOM listo antes de pintar
    setTimeout(async () => {

        const listaDiv = document.getElementById("clientesListaInner");
        const contenidoDiv = document.getElementById("clienteCitasContenido");
        const tituloCliente = document.getElementById("clienteTitulo");

        const citas = await window.api.getCitas("ALL");

        // Agrupar citas por cliente
        const porCliente = {};
        citas.forEach(c => {
            if (!porCliente[c.cliente]) porCliente[c.cliente] = [];
            porCliente[c.cliente].push(c);
        });

        // Pintar lado izquierdo (lista)
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



// ========================================================
// PANEL DE ADMINISTRACIÓN PRINCIPAL
// ========================================================
function renderAdminPanel(main) {

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



// ========================================================
// ADMIN - GESTIÓN DE USUARIOS
// ========================================================
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

    // ========== CAMBIAR ROL ==========
    tbody.querySelectorAll("select").forEach(sel => {

        sel.onchange = async () => {

            await window.api.updateUserRole({
                id: sel.getAttribute("data-user-id"),
                role: sel.value
            });

            alert("Rol actualizado correctamente");
        };
    });

    // ========== ELIMINAR USUARIO ==========
    tbody.querySelectorAll("button[data-del]").forEach(btn => {

        btn.onclick = async () => {

            if (!confirm("¿Eliminar este usuario?")) return;

            await window.api.deleteUser(btn.getAttribute("data-del"));

            // Recargar sección
            renderAdminUsuarios(main);
        };
    });
}



// ========================================================
// ADMIN - TODAS LAS CITAS
// ========================================================
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

    // ========== EDITAR CITA ==========
    tbody.querySelectorAll("button[data-edit]").forEach(btn => {

        btn.onclick = () => {

            const id = btn.getAttribute("data-edit");
            const c = citas.find(ci => ci.id == id);

            openEditPopupFromAdmin(c);
        };
    });

    // ========== ELIMINAR CITA ==========
    tbody.querySelectorAll("button[data-del]").forEach(btn => {

        btn.onclick = async () => {

            if (!confirm("¿Eliminar esta cita?")) return;

            await window.api.deleteCita(btn.getAttribute("data-del"));

            renderAdminCitas(main);
        };
    });
}



// ========================================================
// ADMIN - TRABAJADORES
// ========================================================
async function renderTrabajadores(main) {

    if (role !== "admin") {
        main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
        return;
    }

    main.innerHTML = `
        <h1>Trabajadores 👥</h1>
        <p>Gestión de trabajadores.</p>

        <div id="trabajadoresLista"></div>
    `;

    const users = await window.api.getAllUsers();
    const trabajadores = users.filter(u => u.role === "trabajador");

    let html = "<ul>";

    trabajadores.forEach(t => {
        html += `<li>${t.username} — ${t.email}</li>`;
    });

    html += "</ul>";

    document.getElementById("trabajadoresLista").innerHTML = html;
}



// ========================================================
// EDITAR CITA DESDE ADMIN
// ========================================================
function openEditPopupFromAdmin(c) {

    isEditing = true;
    editingEvent = null;
    editingId = c.id;

    popupFecha = c.fecha;
    popupHora = c.hora;

    document.getElementById("citaCliente").value = c.cliente;
    document.getElementById("citaTelefono").value = c.telefono;
    document.getElementById("citaNota").value = c.nota;

    document.getElementById("popupTitulo").textContent = "Editar cita";
    document.getElementById("popupCita").style.display = "flex";
}

// ========================================================
// SECCIÓN EMPRESAS (lista, buscador, vista previa, editar)
// ========================================================

// Variables globales de empresas
let empresasGlobal = [];   // Array con TODAS las empresas
let empresaIndex = 0;      // Índice usado para navegar en el popup
let empresaActual = null;  // Empresa actualmente mostrada en el popup

// ========================================================
// Renderizar la pantalla de EMPRESAS
// ========================================================
async function renderEmpresas(main) {

    if (role !== "admin") {
        main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
        return;
    }

    // Obtener empresas de la BD
    empresasGlobal = await window.api.getEmpresas();

    // Estructura general de la pantalla
    main.innerHTML = `
        <h1 class="title-page">Empresas 🏢</h1>

        <!-- 🔍 BUSCADOR -->
        <div class="empresa-toolbar">
            <input id="buscarEmpresa" 
                   class="empresa-search" 
                   type="text"
                   placeholder="🔍 Buscar empresa...">
        </div>

        <!-- Botón añadir -->
        <div class="empresa-actions">
            <button class="btn-primary add-empresa-btn" onclick="nuevaEmpresa()">
                ➕ Añadir empresa
            </button>
        </div>

        <!-- GRID donde se pintan los cards -->
        <div id="empresaGrid" class="empresa-grid"></div>
    `;

    // Pintar todas las empresas al entrar
    pintarEmpresas(empresasGlobal);

    // Filtro del buscador
    document.getElementById("buscarEmpresa").oninput = (e) => {
        const q = e.target.value.toLowerCase();

        const filtradas = empresasGlobal.filter(emp =>
            emp.nombre.toLowerCase().includes(q)
        );

        pintarEmpresas(filtradas);
    };
}


// ========================================================
// Pintar los CARD VIEW de empresas
// ========================================================
function pintarEmpresas(lista) {

    const grid = document.getElementById("empresaGrid");
    if (!grid) return;

    // Si no hay resultados
    if (lista.length === 0) {
        grid.innerHTML = `<p class="empty-text">No hay empresas que coincidan con la búsqueda.</p>`;
        return;
    }

    // Pintado dinámico
    grid.innerHTML = lista.map((e, index) => `
        <div class="empresa-card-view" onclick="abrirEmpresa(${index})">

            <img src="${e.imagen || '../assets/default_company.png'}"
                 class="empresa-img">

            <div class="empresa-info">
                <h3>${e.nombre}</h3>
                <p><b>Dirección:</b> ${e.direccion || "—"}</p>
                <p><b>Teléfono:</b> ${e.telefono || "—"}</p>
            </div>
        </div>
    `).join("");
}


// ========================================================
// ELIMINAR empresa desde el CARD (NO desde popup)
// ========================================================
async function eliminarEmpresa(ev, id) {
    ev.stopPropagation(); // Evita abrir el popup al pulsar eliminar

    if (!confirm("¿Eliminar esta empresa?")) return;

    await window.api.deleteEmpresa(id);

    // Actualizar lista en memoria
    empresasGlobal = empresasGlobal.filter(e => e.id !== id);

    // Repintar la UI
    pintarEmpresas(empresasGlobal);
}



// ========================================================
// POPUP NUEVA / EDITAR EMPRESA
// ========================================================

// Abrir popup vacío → MODO CREAR
function nuevaEmpresa() {
    empresaIndex = null; // NO estamos editando
    limpiarPopupEmpresa();
    document.getElementById("popupEmpresa").style.display = "flex";
}

// Cerrar popup de empresa
document.getElementById("cancelarEmpresaPopup").onclick = () => {
    limpiarPopupEmpresa();
    document.getElementById("popupEmpresa").style.display = "none";
};


// Guardar empresa (CREAR o EDITAR)
// Guardar empresa (CREAR o EDITAR)
document.getElementById("guardarEmpresaPopup").onclick = async () => {

    // 🔹 Tomamos los elementos del DOM de forma segura
    const nombreInput    = document.getElementById("empNombre");
    const direccionInput = document.getElementById("empDireccion");
    const telefonoInput  = document.getElementById("empTelefono");
    const imgInput       = document.getElementById("empImagen");

    const nombre    = nombreInput.value.trim();
    const direccion = direccionInput.value.trim();
    const telefono  = telefonoInput.value.trim();

    if (!nombre) {
        alert("El nombre es obligatorio.");
        return;
    }

    // 🔹 Mantener la imagen anterior si estamos editando
    let imagen = (empresaIndex !== null && empresaIndex !== undefined)
        ? empresasGlobal[empresaIndex].imagen
        : null;

    // Si se ha elegido una nueva imagen, la convertimos a base64
    if (imgInput.files.length > 0) {
        imagen = await fileToBase64(imgInput.files[0]);
    }

    const esEdicion = empresaIndex !== null && empresaIndex !== undefined;

    if (esEdicion) {
        // 🔄 EDITAR EMPRESA
        await window.api.updateEmpresa({
            id: empresasGlobal[empresaIndex].id,
            nombre,
            direccion,
            telefono,
            imagen
        });
    } else {
        // ➕ CREAR EMPRESA
        await window.api.addEmpresa({
            nombre,
            direccion,
            telefono,
            imagen
        });
    }

    // Limpiar popup y cerrarlo
    limpiarPopupEmpresa();
    document.getElementById("popupEmpresa").style.display = "none";

    // Recargar SOLO la sección de empresas
    const main = document.getElementById("mainContent");
    await renderEmpresas(main);
};



// ========================================================
// Convertir archivo a Base64
// ========================================================
function fileToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}


// ========================================================
// Limpiar campos del popup de empresa
// ========================================================
function limpiarPopupEmpresa() {
    document.getElementById("empNombre").value = "";
    document.getElementById("empDireccion").value = "";
    document.getElementById("empTelefono").value = "";
    document.getElementById("empImagen").value = "";
}



// ========================================================
// POPUP VER EMPRESA (vista previa con navegación)
// ========================================================
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



// ========================================================
// Navegación del popup de vista previa
// ========================================================
document.getElementById("empresaPrevBtn").onclick = () => {
    empresaIndex = (empresaIndex - 1 + empresasGlobal.length) % empresasGlobal.length;
    abrirEmpresa(empresaIndex);
};

document.getElementById("empresaNextBtn").onclick = () => {
    empresaIndex = (empresaIndex + 1) % empresasGlobal.length;
    abrirEmpresa(empresaIndex);
};


// Cerrar popup de vista previa
document.getElementById("empresaViewClose").onclick = () => {
    document.getElementById("popupEmpresaView").style.display = "none";
};



// ========================================================
// BOTÓN EDITAR dentro del popup de vista previa
// ========================================================
document.getElementById("empresaEditBtn").onclick = () => {

    const e = empresasGlobal[empresaIndex];

    // Rellenar popup de edición
    document.getElementById("empNombre").value = e.nombre;
    document.getElementById("empDireccion").value = e.direccion || "";
    document.getElementById("empTelefono").value = e.telefono || "";

    // Ocultar vista previa
    document.getElementById("popupEmpresaView").style.display = "none";

    // Mostrar popup de edición
    document.getElementById("popupEmpresa").style.display = "flex";
};



// ========================================================
// ELIMINAR empresa desde POPUP DE VISTA PREVIA
// ========================================================
document.getElementById("borrarEmpresaPreview").onclick = async () => {

    if (!empresaActual) return;

    const confirmar = confirm(
        `¿Seguro que quieres eliminar "${empresaActual.nombre}"?`
    );

    if (!confirmar) return;

    await window.api.deleteEmpresa(empresaActual.id);

    // Quitar de memoria
    empresasGlobal = empresasGlobal.filter(e => e.id !== empresaActual.id);

    // Cerrar popup
    document.getElementById("popupEmpresaView").style.display = "none";

    // Repintar inmediatamente
    pintarEmpresas(empresasGlobal);
};







// ========================================================
// 👷 TRABAJADORES - variables globales
// ========================================================
let trabajadoresGlobal = [];
let trabajadorIndex = null;
let trabajadorActual = null;
let empresasGlobalList = [];   // empresas para el select

// ========================================================
// 👷 Renderizar pantalla de TRABAJADORES
// ========================================================
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
            <input id="buscarTrabajador"
                   class="empresa-search"
                   type="text"
                   placeholder="🔍 Buscar trabajador...">
        </div>

        <div class="empresa-actions">
            <button class="btn-primary add-empresa-btn" onclick="nuevoTrabajador()">
                ➕ Añadir trabajador
            </button>
        </div>

        <!-- OJO: id = trabajadorGrid -->
        <div id="trabajadorGrid" class="empresa-grid"></div>
    `;

    // Pintar todos al inicio
    pintarTrabajadores(trabajadoresGlobal);

    // Buscador por nombre de usuario
    document.getElementById("buscarTrabajador").oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const filtrados = trabajadoresGlobal.filter(t =>
            (t.username || "").toLowerCase().includes(q)
        );
        pintarTrabajadores(filtrados);
    };
}

// ========================================================
// 👷 Pintar lista de trabajadores (CARD VIEW)
// ========================================================
function pintarTrabajadores(lista) {

    const grid = document.getElementById("trabajadorGrid");
    if (!grid) return;

    if (lista.length === 0) {
        grid.innerHTML = `<p class="empty-text">No hay trabajadores.</p>`;
        return;
    }

    grid.innerHTML = lista.map((t, index) => `
        <div class="empresa-card-view trabajador-card-view" onclick="abrirTrabajador(${index})">
            <div class="empresa-info trabajador-info">
                <h3>${t.username}</h3>
                <p><b>Email:</b> ${t.email}</p>
                <p><b>Empresa:</b> ${t.empresaNombre || "Sin asignar"}</p>
            </div>
        </div>
    `).join("");
}


// ========================================================
// 👁️ Abrir popup de vista de trabajador
// ========================================================
function abrirTrabajador(index) {

    trabajadorIndex = index;
    trabajadorActual = trabajadoresGlobal[index];

    document.getElementById("trViewNombre").textContent = trabajadorActual.username;
    document.getElementById("trViewEmail").textContent = trabajadorActual.email;

    const empresa = empresasGlobalList.find(e => e.id === trabajadorActual.empresa_id);
    document.getElementById("trViewEmpresa").textContent =
        empresa ? empresa.nombre : "Sin asignar";

    document.getElementById("trViewImg").src =
        trabajadorActual.imagen || "../assets/default_user.png";

    document.getElementById("popupTrabajadorView").style.display = "flex";
}



// ========================================================
// ➕ Nuevo trabajador (abrir popup limpio)
// ========================================================
function nuevoTrabajador() {
    trabajadorIndex = null;
    trabajadorActual = null;

    limpiarPopupTrabajador();
    cargarEmpresasEnSelect();

    document.getElementById("popupTrabajador").style.display = "flex";
}

// ========================================================
// 💾 Guardar trabajador (CREAR o EDITAR)
// ========================================================
document.getElementById("guardarTrabajadorPopup").onclick = async () => {

    const nombre = document.getElementById("trNombre").value.trim();
    const email = document.getElementById("trEmail").value.trim();
    const empresa_id = document.getElementById("trEmpresaSelect").value || null;
    const imgInput = document.getElementById("trImagen");

    if (!nombre || !email) {
        alert("Rellena todos los campos.");
        return;
    }

    // Imagen (si hay archivo)
    let imagen = trabajadorIndex !== null ? trabajadoresGlobal[trabajadorIndex].imagen : null;

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


// ========================================================
// 📋 Rellenar select de empresas en popup trabajador
// ========================================================
function cargarEmpresasEnSelect() {
    const sel = document.getElementById("trEmpresaSelect");
    if (!sel) return;

    sel.innerHTML = empresasGlobalList.map(e =>
        `<option value="${e.id}">${e.nombre}</option>`
    ).join("");
}

// ========================================================
// ❌ Borrar trabajador desde el popup de vista
// ========================================================
document.getElementById("borrarTrabajadorPreview").onclick = async () => {

    if (!trabajadorActual) return;

    if (!confirm("¿Eliminar este trabajador?")) return;

    await window.api.deleteTrabajador(trabajadorActual.id);

    trabajadoresGlobal = trabajadoresGlobal.filter(t => t.id !== trabajadorActual.id);

    document.getElementById("popupTrabajadorView").style.display = "none";
    pintarTrabajadores(trabajadoresGlobal);
};

// ========================================================
// 🧽 LIMPIAR POPUP DE TRABAJADOR
// ========================================================
function limpiarPopupTrabajador() {
    document.getElementById("trNombre").value = "";
    document.getElementById("trEmail").value = "";
    document.getElementById("trEmpresaSelect").value = "";
}


// Cerrar popup de vista de trabajador
const cerrarTrabajadorViewBtn =
    document.getElementById("trabajadorViewClose") ||
    document.getElementById("trViewClose");

if (cerrarTrabajadorViewBtn) {
    cerrarTrabajadorViewBtn.onclick = () => {
        document.getElementById("popupTrabajadorView").style.display = "none";
    };
}


// Cancelar popup de edición de trabajador
const cancelarTrabajadorBtn = document.getElementById("cancelarTrabajadorPopup");
if (cancelarTrabajadorBtn) {
    cancelarTrabajadorBtn.onclick = () => {
        limpiarPopupTrabajador();
        document.getElementById("popupTrabajador").style.display = "none";
    };
}



// Editar trabajador desde el popup de vista
document.getElementById("trEditarBtn").onclick = () => {

    if (!trabajadorActual) return;

    // Encontrar índice REAL en trabajadoresGlobal
    trabajadorIndex = trabajadoresGlobal.findIndex(
        t => t.id === trabajadorActual.id
    );

    // Rellenar los inputs del popup de edición
    document.getElementById("trNombre").value = trabajadorActual.username;
    document.getElementById("trEmail").value = trabajadorActual.email;

    cargarEmpresasEnSelect();

    if (trabajadorActual.empresa_id) {
        document.getElementById("trEmpresaSelect").value = trabajadorActual.empresa_id;
    }

    // Cerrar vista previa
    document.getElementById("popupTrabajadorView").style.display = "none";

    // Abrir popup de edición
    document.getElementById("popupTrabajadorTitulo").textContent = "Editar trabajador";
    document.getElementById("popupTrabajador").style.display = "flex";
};














function openEditPopupFromAdmin(c) {
    isEditing = true;
    editingEvent = null;
    editingId = c.id;

    popupFecha = c.fecha;
    popupHora = c.hora;
    document.getElementById("citaCliente").value = c.cliente;
    document.getElementById("citaTelefono").value = c.telefono;
    document.getElementById("citaNota").value = c.nota;

    document.getElementById("popupTitulo").textContent = "Editar cita";
    document.getElementById("popupCita").style.display = "flex";
}


// TOGGLE DEL SUBMENÚ ADMINISTRACIÓN AVANZADA
const adminToggleBtn = document.getElementById("adminToggleBtn");
const adminSubmenu = document.getElementById("adminSubmenu");

if (adminToggleBtn) {
    adminToggleBtn.addEventListener("click", () => {
        const visible = adminSubmenu.style.display === "flex";

        adminSubmenu.style.display = visible ? "none" : "flex";

        adminToggleBtn.textContent = visible
            ? "⚙️ Administración avanzada ▾"
            : "⚙️ Administración avanzada ▴";
    });
}

function toggleAdminMenu() {
    const submenu = document.getElementById("submenuAdmin");
    submenu.style.display = submenu.style.display === "flex" ? "none" : "flex";
}




// ========================================================
// LOGOUT
// ========================================================
function logout() {
    localStorage.clear();
    window.location.href = "../index.html";
}
