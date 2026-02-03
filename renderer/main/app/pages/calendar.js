import { state } from "../state.js";
import { api } from "../api.js";
import { getAvatarHTML, assetUrl } from "../helpers/dom.js";

let calendar = null;

let popupFecha = "";
let popupHora = "";
let isEditing = false;
let editingId = null;

function getSelectedEmpresaId() {
  return localStorage.getItem("seleccion_empresa");
}
function getSelectedTrabajadorId() {
  return localStorage.getItem("seleccion_trabajador");
}

function getColorByEstado(estado) {
  if (estado === "cancelada") return "#9ca3af";
  if (estado === "completada") return "#16a34a";
  return "#dc2626";
}

function addCitaToCalendar(c) {
  if (!calendar) return;

  const estado = c.estado || "reservado";
  const color = getColorByEstado(estado);

  const idReal = c.id ?? c.cita_id ?? c.citaId;

  calendar.addEvent({
    title: c.cliente || "Reservado",
    start: (c.hora && c.hora.length === 5)
      ? `${c.fecha}T${c.hora}:00`
      : `${c.fecha}T${c.hora}`,
    backgroundColor: color,
    borderColor: color,
    extendedProps: { ...c, id: idReal }
  });
}

export async function seleccionarEmpresa(main) {
  const empresas = await api.getEmpresas();

  const defaultCompany = assetUrl("default_company.png");

  main.innerHTML = `
    <h1>Selecciona una empresa 🏢</h1>
    <div class="empresa-grid">
      ${empresas.map(e => `
        <div class="empresa-card-view" onclick="seleccionarTrabajador(${e.id})">
          <img src="${e.imagen || defaultCompany}" class="empresa-img">
          <div class="empresa-info">
            <h3>${e.nombre}</h3>
            <p>${e.direccion || "Sin dirección"}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

window.seleccionarTrabajador = seleccionarTrabajador;

export async function seleccionarTrabajador(empresaId) {
  const main = document.getElementById("mainContent");

  const trabajadores = await api.getTrabajadores();
  const lista = trabajadores.filter(t => String(t.empresa_id) === String(empresaId));

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
            <p>${t.email || ""}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

window.abrirCalendarioTrabajador = abrirCalendarioTrabajador;

export function abrirCalendarioTrabajador(trabajadorId, empresaId) {
  localStorage.setItem("seleccion_trabajador", trabajadorId);
  localStorage.setItem("seleccion_empresa", empresaId);

  const main = document.getElementById("mainContent");
  renderCalendario(main);
}

export async function renderCalendario(main) {
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

        const refreshHourPanel = () => {
          if (hourPanel && hourPanel.style.display === "block") {
            const dateStr = hourPanel.dataset.date;
            if (dateStr) generateHours(dateStr);
          }
        };

        if (opcion === "1") {
          await api.setCitaEstado({ id, estado: "completada" });
          const color = getColorByEstado("completada");
          ev.setProp("backgroundColor", color);
          ev.setProp("borderColor", color);
          ev.setExtendedProp("estado", "completada");
          refreshHourPanel();
          return;
        }

        if (opcion === "2") {
          await api.setCitaEstado({ id, estado: "cancelada" });
          const color = getColorByEstado("cancelada");
          ev.setProp("backgroundColor", color);
          ev.setProp("borderColor", color);
          ev.setExtendedProp("estado", "cancelada");
          refreshHourPanel();
          return;
        }

        if (opcion === "3") {
          openEditPopup(ev);
          return;
        }

        if (opcion === "4") {
          if (!confirm("¿Eliminar definitivamente esta cita?")) return;
          await api.deleteCita(id);
          ev.remove();
          refreshHourPanel();
          return;
        }
      }
    });

    calendar.render();
    await loadAndPaintCitas();

    async function loadAndPaintCitas() {
      const citas = await api.getCitas("ALL");

      const filtradas = citas.filter(c => {
        const tId = c.trabajador_id ?? c.userId ?? c.trabajadorId;
        const eId = c.empresa_id ?? c.empresaId;
        const okTrab = String(tId) === String(trabajadorIdSel);
        const okEmp = empresaId ? String(eId) === String(empresaId) : true;
        return okTrab && okEmp;
      });

      calendar.removeAllEvents();
      filtradas.forEach(c => addCitaToCalendar(c));
    }

    function generateHours(dateStr) {
      hourList.innerHTML = "";
      hourPanel.style.display = "block";
      hourPanel.dataset.date = dateStr;

      const ocupadas = calendar.getEvents()
        .filter(ev => {
          const sameDay = ev.start.toISOString().split("T")[0] === dateStr;
          const estado = ev.extendedProps?.estado || "reservado";
          return sameDay && estado !== "cancelada";
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
          btn.disabled = true;
        } else {
          btn.onclick = () => openNewCitaPopup(dateStr, hora);
        }

        hourList.appendChild(btn);
      }
    }

    function openNewCitaPopup(date, hour) {
      isEditing = false;
      editingId = null;

      popupFecha = date;
      popupHora = hour;

      document.getElementById("citaCliente").value = state.username || "";
      document.getElementById("citaTelefono").value = "";
      document.getElementById("citaNota").value = "";
      document.getElementById("popupTitulo").textContent = "Nueva cita";

      document.getElementById("popupCita").style.display = "flex";
    }

    function openEditPopup(ev) {
      isEditing = true;
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

    const btnGuardar = document.getElementById("guardarPopup");
    const btnCancelar = document.getElementById("cancelarPopup");

    btnCancelar.onclick = () => {
      document.getElementById("popupCita").style.display = "none";
    };

    btnGuardar.onclick = async () => {
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
        userId: trabajadorId,
        trabajador_id: trabajadorId,
        empresa_id: empresaId,
        username: state.username || ""
      };

      try {
        const resCancelada = await api.findCitaCancelada({
          empresa_id: payload.empresa_id,
          trabajador_id: payload.trabajador_id,
          fecha: payload.fecha,
          hora: payload.hora
        });

        if (isEditing && editingId) {
          await api.updateCita(payload);
        } else if (resCancelada && resCancelada.id) {
          payload.id = resCancelada.id;
          await api.updateCita(payload);
        } else {
          const res = await api.addCita(payload);
          payload.id = res?.id || res?.lastID || null;
        }

        document.getElementById("popupCita").style.display = "none";

        await loadAndPaintCitas();
        const d = hourPanel.dataset.date;
        if (d) generateHours(d);

      } catch (err) {
        console.error("❌ Error guardando cita:", err);

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
  }, 50);
}

window.renderCalendario = renderCalendario;
