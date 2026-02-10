import { state } from "../state.js";
import { api } from "../api.js";
import { notify } from "../helpers/notify.js";
import { getAvatarHTML, assetUrl } from "../helpers/dom.js";

let calendar = null;

let popupFecha = "";
let popupHora = "";
let isEditing = false;
let editingId = null;

function isWorkerRole() {
  const r = String(state.role || "").toLowerCase();
  return r === "trabajador" || r === "trabajadores";
}
function isClienteRole() {
  return String(state.role || "").toLowerCase() === "cliente";
}
function isAdminRole() {
  return String(state.role || "").toLowerCase() === "admin";
}

function getSelectedEmpresaId() {
  return localStorage.getItem("seleccion_empresa");
}
function getSelectedTrabajadorId() {
  return localStorage.getItem("seleccion_trabajador");
}

function getColorByEstado(estado) {
  const e = String(estado || "reservado").toLowerCase();
  if (e === "cancelada") return "#9ca3af";
  if (e === "completada") return "#16a34a";
  return "#dc2626";
}

function addCitaToCalendar(c) {
  if (!calendar) return;

  const estado = c.estado || "reservado";
  const color = getColorByEstado(estado);
  const idReal = c.id ?? c.cita_id ?? c.citaId;

  calendar.addEvent({
    title: c.cliente || "Reservado",
    start: (c.hora && String(c.hora).length === 5)
      ? `${c.fecha}T${c.hora}:00`
      : `${c.fecha}T${c.hora}`,
    backgroundColor: color,
    borderColor: color,
    extendedProps: { ...c, id: idReal }
  });
}

/* =========================================================
   MODO ADMIN/CLIENTE: seleccion empresa -> trabajador
   ========================================================= */
export async function seleccionarEmpresa(main) {
  // Si es trabajador, forzamos su calendario directamente
  if (isWorkerRole()) return abrirCalendarioTrabajadorActual(main);

  const empresas = await api.getEmpresas();
  const defaultCompany = assetUrl("default_company.png");

  main.innerHTML = `
    <h1>Selecciona una empresa 🏢</h1>
    <div class="empresa-grid">
      ${(empresas || []).map(e => `
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
  const lista = (trabajadores || []).filter(t => String(t.empresa_id) === String(empresaId));

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

/* =========================================================
   CALENDARIO NORMAL (cliente/admin) - con reservas
   ========================================================= */
export async function renderCalendario(main) {
  // Si es trabajador, solo lectura
  if (isWorkerRole()) return abrirCalendarioTrabajadorActual(main);

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

    // cache vacaciones del trabajador seleccionado (para bloquear)
    let vacacionesSet = new Set();
    async function cargarVacacionesTrabajadorSel() {
      vacacionesSet = new Set();
      if (!api.getVacaciones || !trabajadorIdSel) return;
      try {
        const vacs = await api.getVacaciones({ trabajador_id: trabajadorIdSel });
        (vacs || []).forEach(v => {
          if (v?.fecha) vacacionesSet.add(String(v.fecha));
        });
      } catch (e) {
        console.warn("No se pudieron cargar vacaciones:", e);
      }
    }

    await cargarVacacionesTrabajadorSel();

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

      // ✅ click día -> horas (bloquea si vacaciones)
      dateClick(info) {
        generateHours(info.dateStr);
      },

      // ✅ Cliente: solo ver info
      // ✅ Admin: puede gestionar
      eventClick: async (info) => {
        const ev = info.event;
        const id = ev.extendedProps.id;
        const ext = ev.extendedProps || {};

        // Cliente: SOLO INFO
        if (isClienteRole()) {
          const estado = (ext.estado || "reservado");
          alert(
            `Cita\n\n` +
            `Cliente: ${ext.cliente || "—"}\n` +
            `Teléfono: ${ext.telefono || "—"}\n` +
            `Fecha: ${ext.fecha || ev.startStr?.split("T")[0]}\n` +
            `Hora: ${ext.hora || ev.start?.toTimeString()?.slice(0,5)}\n` +
            `Estado: ${estado}\n` +
            (ext.nota ? `\nNota: ${ext.nota}` : "")
          );
          return;
        }

        // Admin (o roles no cliente): gestión completa
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

      const filtradas = (citas || []).filter(c => {
        const tId = c.trabajador_id ?? c.userId ?? c.trabajadorId;
        const eId = c.empresa_id ?? c.empresaId;
        const okTrab = String(tId) === String(trabajadorIdSel);
        const okEmp = empresaId ? String(eId) === String(empresaId) : true;
        return okTrab && okEmp;
      });

      calendar.removeAllEvents();
      filtradas.forEach(c => addCitaToCalendar(c));
    }

    // ✅ ahora es async para poder hacer await (vacaciones)
    async function generateHours(dateStr) {
      hourList.innerHTML = "";
      hourPanel.style.display = "block";
      hourPanel.dataset.date = dateStr;

      // ✅ BLOQUEO POR VACACIONES (día completo)
      // refresca por si cambian desde otro sitio
      await cargarVacacionesTrabajadorSel();

      if (vacacionesSet.has(String(dateStr))) {
        hourList.innerHTML = `
          <div style="padding:12px;border:1px dashed #e5e7eb;border-radius:12px;background:#fff7ed;color:#9a3412;">
            🏖️ Este día el trabajador está de vacaciones. <b>No se pueden reservar citas</b>.
          </div>
        `;
        return;
      }

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

    function bindTelefono9Digitos() {
      const telInput = document.getElementById("citaTelefono");
      if (!telInput) return;

      telInput.setAttribute("inputmode", "numeric");
      telInput.setAttribute("maxlength", "9");

      telInput.oninput = () => {
        telInput.value = telInput.value.replace(/\D/g, "").slice(0, 9);
      };
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

      bindTelefono9Digitos();
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

      bindTelefono9Digitos();
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
      const telRaw = document.getElementById("citaTelefono").value.trim();
      const telefono = telRaw.replace(/\D/g, "");
      const nota = document.getElementById("citaNota").value.trim();

      if (!cliente) return alert("⚠️ Debes introducir tu nombre.");
      if (!telefono) return alert("⚠️ Debes introducir tu teléfono.");
      if (!/^\d{9}$/.test(telefono)) return alert("⚠️ El teléfono debe tener exactamente 9 dígitos.");
      if (!popupFecha || !popupHora) return alert("Faltan datos (fecha/hora).");

      // ✅ SEGURIDAD EXTRA: re-check vacaciones justo antes de guardar
      if (api.getVacaciones) {
        try {
          const vacs = await api.getVacaciones({ trabajador_id: trabajadorId });
          const estaVac = (vacs || []).some(v => String(v.fecha) === String(popupFecha));
          if (estaVac) {
            alert("🏖️ Ese día el trabajador está de vacaciones. No puedes reservar.");
            return;
          }
        } catch {}
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

        // ✅ para que luego el cliente vea sus citas
        cliente_id: isClienteRole() ? state.userId : null,

        // fallback
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

        // ✅ Notificación SOLO cliente (solo cuando es NUEVA)
        if (isClienteRole() && !isEditing) {
          await notify("✅ Cita reservada", `Tu cita ha sido reservada para ${payload.fecha} a las ${payload.hora}.`);
        }

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

        alert("❌ No se pudo guardar la cita. Mira la consola.");
      }
    };
  }, 50);
}

/* =========================================================
   MODO TRABAJADOR SOLO LECTURA
   ========================================================= */
export async function abrirCalendarioTrabajadorActual(main) {
  main.innerHTML = `
    <h1>Calendario 📅</h1>
    <p style="margin-top:6px;color:#6b7280;">Solo lectura (tus citas)</p>
    <div id="calendar" style="margin-top:20px;"></div>
  `;

  const calendarEl = document.getElementById("calendar");
  const trabajadorId = state.userId;

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "es",
    firstDay: 1,
    height: "auto",
    selectable: false,
    editable: false,
    eventStartEditable: false,
    eventDurationEditable: false,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },

    dateClick: null,

    eventClick: (info) => {
      const c = info.event.extendedProps || {};
      const estado = c.estado || "reservado";
      alert(
        `Cita\n\n` +
        `Cliente: ${c.cliente || "—"}\n` +
        `Teléfono: ${c.telefono || "—"}\n` +
        `Fecha: ${c.fecha || info.event.startStr?.split("T")[0]}\n` +
        `Hora: ${c.hora || info.event.start?.toTimeString()?.slice(0,5)}\n` +
        `Estado: ${estado}\n` +
        (c.nota ? `\nNota: ${c.nota}` : "")
      );
    }
  });

  calendar.render();

  // cargar solo SUS citas
  let citas = [];
  if (api.getCitasTrabajador) {
    citas = await api.getCitasTrabajador({ trabajador_id: trabajadorId });
  } else {
    const all = await api.getCitas("ALL");
    citas = (all || []).filter(c => String(c.trabajador_id ?? c.userId) === String(trabajadorId));
  }

  calendar.removeAllEvents();
  (citas || []).forEach(c => addCitaToCalendar(c));
}

window.renderCalendario = renderCalendario;
