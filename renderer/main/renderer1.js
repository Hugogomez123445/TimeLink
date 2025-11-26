// ========================================================
// TimeLink - renderer1.js
// Lógica completa del panel, calendario, clientes y admin
// ========================================================

// Datos del usuario
const userId = localStorage.getItem("userId");
const role = localStorage.getItem("role") || "cliente";
const username = localStorage.getItem("username") || "Usuario";
const userEmail = localStorage.getItem("email") || "email@example.com";

// Rellenar info del header
document.getElementById("userName").textContent = username;
document.getElementById("userEmail").textContent = userEmail;

// OCULTAR/MOSTRAR BOTONES SEGÚN ROL
if (role === "cliente") {
    // Cliente ve todo excepto gestión avanzada
    document.getElementById("btnTrabajadores").style.display = "none";
    document.getElementById("btnEmpresas").style.display = "none";
}

else if (role === "trabajador") {
    // Trabajador ve todo excepto gestión avanzada
    document.getElementById("btnTrabajadores").style.display = "none";
    document.getElementById("btnEmpresas").style.display = "none";
}

else if (role === "admin") {
    // Administrador solo ve INICIO, AJUSTES y GESTIÓN AVANZADA
    document.getElementById("btnCalendario").style.display = "none";
    document.getElementById("btnClientes").style.display = "none";
    document.getElementById("btnCitas").style.display = "none";
    document.getElementById("adminPanelBtn").style.display = "none"; // el tuyo antiguo

    document.getElementById("btnTrabajadores").style.display = "block";
    document.getElementById("btnEmpresas").style.display = "block";
}

// MOSTRAR SUBMENÚ SOLO SI ES ADMIN
const submenuAdmin = document.getElementById("submenuAdminContainer");

if (role === "admin") {
    submenuAdmin.style.display = "block";
} else {
    submenuAdmin.style.display = "none";
}




// Variables globales
let calendar = null;
let popupFecha = "";
let popupHora = "";
let isEditing = false;
let editingEvent = null;
let editingId = null;

// ========================================================
// NAVEGACIÓN
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

        case "calendario":
            renderCalendario(main);
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

        case "trabajadores":
            renderTrabajadores(main);
            break;

        case "empresas":
            renderEmpresas(main);
            break;

    }
}

// ========================================================
// CALENDARIO
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

                // Si es cliente y no es su cita → no puede tocarla
                if (role !== "admin" && String(evUserId) !== String(userId)) {
                    alert("No puedes modificar citas de otros clientes.");
                    return;
                }

                const editar = confirm("Aceptar = Editar la cita\nCancelar = Eliminar la cita");

                if (editar) {
                    openEditPopup(ev);
                } else {
                    deleteEvent(ev);
                }
            }
        });

        calendar.render();

        // Cargar todas las citas
        const citas = await window.api.getCitas("ALL");
        citas.forEach(c => addCitaToCalendar(c));

        // FUNCIONES INTERNAS --------------------------------

        function generateHours(dateStr) {
            hourList.innerHTML = "";
            hourPanel.style.display = "block";

            const occupied = calendar.getEvents()
                .filter(ev => ev.start.toISOString().split("T")[0] === dateStr)
                .map(ev => ev.start.toTimeString().slice(0, 5));

            for (let min = 9 * 60; min <= 18 * 60; min += 30) {
                let h = String(Math.floor(min / 60)).padStart(2, "0");
                let m = String(min % 60).padStart(2, "0");
                let hourText = `${h}:${m}`;

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

        function openNewCitaPopup(date, hour) {
            isEditing = false;
            editingEvent = null;
            editingId = null;

            popupFecha = date;
            popupHora = hour;

            // AUTORELLENAR NOMBRE DEL CLIENTE
            document.getElementById("citaCliente").value = username;

            document.getElementById("citaTelefono").value = "";
            document.getElementById("citaNota").value = "";
            document.getElementById("popupTitulo").textContent = "Nueva cita";
            document.getElementById("popupCita").style.display = "flex";
        }

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

        async function deleteEvent(ev) {
            if (confirm("¿Eliminar esta cita?")) {
                await window.api.deleteCita(ev.extendedProps.id);
                ev.remove();
            }
        }
    }, 50);
}

// ========================================================
// AÑADIR EVENTO AL CALENDARIO
// ========================================================
function addCitaToCalendar(c) {
    if (!calendar) return;

    const esPropia = String(c.userId) === String(userId);

    calendar.addEvent({
        title: role === "admin" ? `${c.cliente} (${c.username})` : esPropia ? c.cliente : "Ocupado",
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
// POPUP GUARDAR / CANCELAR
// ========================================================
document.getElementById("cancelarPopup").onclick = () => {
    document.getElementById("popupCita").style.display = "none";
};

document.getElementById("guardarPopup").onclick = async () => {
    const cliente = document.getElementById("citaCliente").value;
    const telefono = document.getElementById("citaTelefono").value;
    const nota = document.getElementById("citaNota").value;

    if (!cliente || !popupFecha || !popupHora) {
        alert("Faltan datos.");
        return;
    }

    if (isEditing && editingId) {
        // EDITAR EXISTENTE
        const res = await window.api.updateCita({
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
        // NUEVA CITA
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
// SECCIÓN CLIENTES (solo admin)
// ========================================================
async function renderClientes(main) {
   if (role !== "admin" && role !== "trabajador") {
    main.innerHTML = `<h1>Acceso denegado 🔒</h1>`;
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

// ========================================================
// PANEL ADMIN
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
// Mostrar Panel Admin para admin y trabajador
if (role === "trabajador") {
    document.getElementById("adminPanelBtn").style.display = "block";
}

// ========================================================
// ADMIN USUARIOS
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
            <option value="admin" ${u.role === "trabajador" ? "selected" : ""}>Trabajador</option>

        </select>
      </td>
      <td>
        <button data-del="${u.id}" class="btn-danger">Eliminar</button>
      </td>
    `;
        tbody.appendChild(tr);
    });

    // Cambiar rol
    tbody.querySelectorAll("select").forEach(sel => {
        sel.onchange = async () => {
            await window.api.updateUserRole({
                id: sel.getAttribute("data-user-id"),
                role: sel.value
            });
            alert("Rol actualizado");
        };
    });

    // Eliminar usuario
    tbody.querySelectorAll("button[data-del]").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("¿Eliminar este usuario?")) return;
            await window.api.deleteUser(btn.getAttribute("data-del"));
            renderAdminUsuarios(main);
        };
    });
}

// ========================================================
// ADMIN CITAS
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

    // Editar cita
    tbody.querySelectorAll("button[data-edit]").forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute("data-edit");
            const c = citas.find(ci => ci.id == id);
            openEditPopupFromAdmin(c);
        };
    });

    // Eliminar cita
    tbody.querySelectorAll("button[data-del]").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("¿Eliminar cita?")) return;
            await window.api.deleteCita(btn.getAttribute("data-del"));
            renderAdminCitas(main);
        };
    });
}

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
        html += `<li>${t.username} - ${t.email}</li>`;
    });
    html += "</ul>";

    document.getElementById("trabajadoresLista").innerHTML = html;
}

function renderEmpresas(main) {
    if (role !== "admin") {
        main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
        return;
    }

    main.innerHTML = `
        <h1>Empresas 🏢</h1>
        <p>Gestión de empresas próximamente...</p>
    `;
}


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
