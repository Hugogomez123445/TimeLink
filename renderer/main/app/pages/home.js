import { state } from "../state.js";
import { api } from "../api.js";

/* =========================
   INICIO BÁSICO
========================= */
export function cargarInicioBasico() {
  const main = document.getElementById("mainContent");
  main.innerHTML = `
    <h1>Bienvenido</h1>
    <p>Selecciona una opción del menú para comenzar.</p>
  `;
}

/* =========================
   HELPERS "NUEVAS CITAS" (TRABAJADOR)
========================= */
function seenKeyTrabajador() {
  return `timelink_trabajador_seen_${state.userId}`;
}

// Convierte "YYYY-MM-DD HH:MM:SS" -> Date (SQLite)
function parseDbDate(s) {
  if (!s) return null;
  const iso = String(s).replace(" ", "T");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function getLastSeenTrabajador() {
  const raw = localStorage.getItem(seenKeyTrabajador());
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

// ✅ exportable para poder limpiarlo desde citas.js si quieres
export function setLastSeenTrabajador(dateObj = new Date()) {
  localStorage.setItem(seenKeyTrabajador(), dateObj.toISOString());
}

/* =========================
   INICIO ADMIN
========================= */
export function cargarInicioAdmin() {
  const main = document.getElementById("mainContent");

  main.innerHTML = `
    <h1>PANEL DE ADMINISTRACION</h1>

    <div class="dashboard-grid">
      <div class="dash-card">
        <h3>🏢 Empresas</h3>
        <p id="dashEmpresas">0</p>
      </div>

      <div class="dash-card">
        <h3>👥 Trabajadores</h3>
        <p id="dashTrabajadores">0</p>
        <small style="color:#6b7280;">(aprobados)</small>
      </div>

      <div class="dash-card">
        <h3>👤 Clientes</h3>
        <p id="dashClientes">0</p>
      </div>

      <div class="dash-card">
        <h3>📝 Citas hoy</h3>
        <p id="dashCitasHoy">0</p>
        <small style="color:#6b7280;">(reservadas)</small>
      </div>

      <div class="dash-card">
        <h3>📚 Citas totales</h3>
        <p id="dashCitasTotales">0</p>
        <small style="color:#6b7280;">(todas las empresas)</small>
      </div>
    </div>

    <div class="panel-box">
      <h2>📈 Citas en los últimos 7 días</h2>
      <canvas id="graficaSemanal"></canvas>
    </div>

    <div class="alert-box">
      <h2>🚨 Alertas importantes</h2>
      <div id="alertasLista"></div>
    </div>

    <div class="panel-box">
      <h2>📰 Actividad Reciente</h2>
      <div id="actividadReciente"></div>
    </div>
  `;

  cargarDashboardAdmin();
}

async function cargarDashboardAdmin() {
  const empresas = await api.getEmpresas();
  const trabajadores = await api.getTrabajadores();
  const clientes = await api.getClientes();
  const citas = await api.getCitas("ALL");

  const aprobados = (trabajadores || []).filter(t => (t.estado || "pendiente") === "aprobado");
  const pendientes = (trabajadores || []).filter(t => (t.estado || "pendiente") !== "aprobado");

  document.getElementById("dashEmpresas").textContent = (empresas || []).length;
  document.getElementById("dashTrabajadores").textContent = aprobados.length;
  document.getElementById("dashClientes").textContent = (clientes || []).length;

  const hoy = new Date().toISOString().split("T")[0];

  const citasHoyReservadas = (citas || []).filter(c =>
    c.fecha === hoy && ((c.estado || "reservado").toLowerCase() === "reservado")
  ).length;

  document.getElementById("dashCitasHoy").textContent = citasHoyReservadas;
  document.getElementById("dashCitasTotales").textContent = (citas || []).length;

  await cargarGraficaSemanal(citas || []);
  await cargarAlertasAdmin({ empresas: empresas || [], trabajadores: trabajadores || [], citas: citas || [], pendientes });
  await cargarActividadReciente(citas || []);
}

async function cargarGraficaSemanal(citas) {
  const fechas = [];
  const cantidades = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const fechaStr = d.toISOString().split("T")[0];
    fechas.push(fechaStr);
    cantidades.push((citas || []).filter(c => c.fecha === fechaStr).length);
  }

  if (!window.Chart) return;

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

async function cargarAlertasAdmin({ empresas, trabajadores, citas, pendientes }) {
  const cont = document.getElementById("alertasLista");
  cont.innerHTML = "";

  const alertas = [];

  if ((pendientes || []).length > 0) {
    alertas.push(`Tienes ${pendientes.length} trabajadores pendientes de aprobación.`);
  }

  const aprobados = (trabajadores || []).filter(t => (t.estado || "pendiente") === "aprobado");
  const sinEmpresa = aprobados.filter(t =>
    !t.empresa_id || !(empresas || []).some(e => String(e.id) === String(t.empresa_id))
  );
  if (sinEmpresa.length > 0) {
    alertas.push(`${sinEmpresa.length} trabajadores aprobados no tienen empresa asignada.`);
  }

  const hoy = new Date().toISOString().split("T")[0];
  const citasPasadasSinNota = (citas || []).filter(c =>
    c.fecha < hoy && (!c.nota || c.nota.trim() === "")
  );
  if (citasPasadasSinNota.length > 0) {
    alertas.push(`${citasPasadasSinNota.length} citas pasadas no tienen nota añadida.`);
  }

  if (alertas.length === 0) {
    cont.innerHTML = `<p style="color:#6b7280;">No hay alertas importantes 🎉</p>`;
    return;
  }

  cont.innerHTML = alertas.map(a => `<div class="alert-item">⚠️ ${a}</div>`).join("");
}

async function cargarActividadReciente(citas) {
  const div = document.getElementById("actividadReciente");
  const ultimas = (citas || []).slice(0, 10);

  if (ultimas.length === 0) {
    div.innerHTML = `<p style="color:#6b7280;">No hay actividad todavía.</p>`;
    return;
  }

  const actividades = ultimas.map(c => {
    const estado = (c.estado || "reservado").toLowerCase();
    const when = c.updated_at || c.created_at || c.fecha;

    let texto = `📅 Cita creada: ${c.cliente || "—"} (${c.fecha} - ${c.hora})`;
    if (estado === "cancelada") texto = `🚫 Cita cancelada: ${c.cliente || "—"} (${c.fecha} - ${c.hora})`;
    if (estado === "completada") texto = `✅ Cita completada: ${c.cliente || "—"} (${c.fecha} - ${c.hora})`;

    return { texto, when };
  });

  div.innerHTML = actividades.map(a => `
    <div class="item">
      <div>${a.texto}</div>
      <div class="fecha">${a.when}</div>
    </div>
  `).join("");
}

/* =========================
   INICIO CLIENTE
========================= */
export async function cargarInicioCliente() {
  const main = document.getElementById("mainContent");

  main.innerHTML = `
    <h1>Hola, ${state.username} </h1>
    <p style="margin-top:-6px; color:#6b7280;">Aquí tienes un resumen de tus citas.</p>

    <div style="display:grid; gap:14px; margin-top:18px;">
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:12px;">
        <div class="dash-card">
          <h3>📅 Próximas</h3>
          <p id="kpiProximas">—</p>
        </div>
        <div class="dash-card">
          <h3>✅ Completadas</h3>
          <p id="kpiCompletadas">—</p>
        </div>
        <div class="dash-card">
          <h3>🚫 Canceladas</h3>
          <p id="kpiCanceladas">—</p>
        </div>
      </div>

      <div class="panel-box">
        <h2 style="margin-bottom:10px;">⏭️ Tus próximas citas</h2>
        <div id="listaProximas"><p style="color:#6b7280;">Cargando…</p></div>
      </div>

      <div class="panel-box">
        <h2 style="margin-bottom:10px;">⚡ Acciones rápidas</h2>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button id="btnIrCalendario" class="btn-primary">📅 Reservar / Ver calendario</button>
          <button id="btnIrCitas" class="btn-primary" style="background:#111827;">📝 Ver mis citas</button>
          <button id="btnIrAjustes" class="btn-primary" style="background:#6b7280;">⚙️ Ajustes</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnIrCalendario").onclick = () => window.navigate?.("calendario");
  document.getElementById("btnIrCitas").onclick = () => window.navigate?.("citas");
  document.getElementById("btnIrAjustes").onclick = () => window.navigate?.("ajustes");

  const citas = await api.getCitas("ALL");

  const userId = String(state.userId || "");
  const userName = (state.username || "").trim().toLowerCase();

  const misCitas = (citas || []).filter(c => {
    const cid = c.cliente_id != null ? String(c.cliente_id) : "";
    const cnom = (c.cliente || "").trim().toLowerCase();
    if (cid) return cid === userId;
    if (cnom) return cnom === userName;
    return false;
  });

  const ordenadas = [...misCitas].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  const hoyStr = new Date().toISOString().split("T")[0];
  const now = new Date();

  const proximas = ordenadas.filter(c => {
    const estado = (c.estado || "reservado").toLowerCase();
    if (estado !== "reservado") return false;

    if (c.fecha > hoyStr) return true;
    if (c.fecha < hoyStr) return false;

    const [hh, mm] = String(c.hora || "00:00").split(":").map(n => Number(n));
    const d = new Date();
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d >= now;
  });

  const completadas = ordenadas.filter(c => (c.estado || "").toLowerCase() === "completada");
  const canceladas = ordenadas.filter(c => (c.estado || "").toLowerCase() === "cancelada");

  document.getElementById("kpiProximas").textContent = proximas.length;
  document.getElementById("kpiCompletadas").textContent = completadas.length;
  document.getElementById("kpiCanceladas").textContent = canceladas.length;

  const lista = document.getElementById("listaProximas");
  if (!proximas.length) {
    lista.innerHTML = `
      <div style="padding:12px; border:1px dashed #e5e7eb; border-radius:12px; color:#6b7280;">
        No tienes próximas citas reservadas.
      </div>
    `;
    return;
  }

  const empresas = await api.getEmpresas().catch(() => []);
  const trabajadores = await api.getTrabajadores().catch(() => []);

  const nombreEmpresa = (id) => (empresas || []).find(e => String(e.id) === String(id))?.nombre || "—";
  const nombreTrabajador = (id) => (trabajadores || []).find(t => String(t.id) === String(id))?.username || "—";

  lista.innerHTML = proximas.slice(0, 8).map(c => {
    const empresaId = c.empresa_id ?? c.empresaId;
    const trabajadorId = c.trabajador_id ?? c.userId ?? c.trabajadorId;

    return `
      <div style="display:flex; justify-content:space-between; gap:12px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; margin-bottom:10px;">
        <div>
          <div style="font-weight:800; font-size:14px;">${c.fecha} · ${c.hora}</div>
          <div style="font-size:13px; color:#374151; margin-top:4px;">
            Empresa ${nombreEmpresa(empresaId)} · Trabajador ${nombreTrabajador(trabajadorId)}
          </div>
          <div style="font-size:12px; color:#6b7280; margin-top:4px;">
            Telf ${c.telefono || "—"} ${c.nota ? ` · Nota ${c.nota}` : ""}
          </div>
        </div>
        <div style="display:flex; align-items:center;">
          <span style="padding:6px 10px; border-radius:999px; font-size:12px; background:#fee2e2; color:#991b1b;">
            reservado
          </span>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================
   INICIO TRABAJADOR (badge + vacaciones)
========================= */
export async function cargarInicioTrabajador() {
  const main = document.getElementById("mainContent");

  main.innerHTML = `
    <h1>PANEL DE TRABAJADOR</h1>
    <p style="margin-top:-6px; color:#6b7280;">Resumen de tus citas y accesos rápidos.</p>

    <div class="dashboard-grid">
      <div class="dash-card">
        <h3>📌 Reservadas</h3>
        <p id="kpiReservadas">0</p>
        <div id="badgeNuevasReservadas" style="margin-top:6px;"></div>
      </div>

      <div class="dash-card">
        <h3>✅ Completadas</h3>
        <p id="kpiCompletadas">0</p>
      </div>

      <div class="dash-card">
        <h3>🚫 Canceladas</h3>
        <p id="kpiCanceladas">0</p>
      </div>

      <div class="dash-card">
        <h3>📅 Próxima cita</h3>
        <p id="kpiProxima">—</p>
      </div>
    </div>

    <div class="panel-box">
      <h2 style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <span>🗓️ Mis próximas citas (reservadas)</span>
        <span style="font-size:12px; color:#6b7280;">(máx. 6)</span>
      </h2>
      <div id="listaProximas"><p style="color:#6b7280;">Cargando...</p></div>
    </div>

    <div class="panel-box">
      <h2>⚡ Accesos rápidos</h2>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn-primary" onclick="navigate('calendario')">📅 Ver calendario</button>
        <button id="btnInicioTrabajadorCitas" class="btn-primary"
          onclick="navigate('citas')" style="background:#111827;">
          📝 Ver mis citas
        </button>
      </div>
      <p style="margin-top:10px; font-size:13px; color:#6b7280;">
        * El badge “nuevas” se limpia cuando entras a <b>Citas</b>.
      </p>
    </div>

    <div class="panel-box">
      <h2 style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <span>🏖️ Vacaciones</span>
        <span id="vacRestantes" style="font-size:12px;color:#6b7280;">—</span>
      </h2>

      <div id="vacacionesList" style="margin-top:10px;">
        <p style="color:#6b7280;">Cargando…</p>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
        <button id="btnAbrirVacaciones" class="btn-primary" style="background:#111827;">➕ Añadir vacaciones</button>
      </div>
    </div>

    <div id="popupVacaciones" class="popup-overlay" style="display:none;">
      <div class="popup-card" style="width:340px;">
        <h2>Vacaciones</h2>
        <p style="font-size:13px;color:#6b7280;margin-top:-6px;">
          Selecciona un rango. Se cancelarán automáticamente las citas reservadas esos días.
        </p>

        <input id="vacDesde" type="date" style="width:100%; margin-top:10px;">
        <input id="vacHasta" type="date" style="width:100%; margin-top:10px;">

        <div class="popup-buttons">
          <button id="vacCancelar" class="popup-btn-cancel">Cancelar</button>
          <button id="vacGuardar" class="popup-btn-confirm">Guardar</button>
        </div>
      </div>
    </div>
  `;

  await cargarDashboardTrabajador();
  await cargarVacacionesTrabajador(); // ✅ FALTABA: imprescindible
}

async function cargarDashboardTrabajador() {
  const trabajadorId = state.userId;
  if (!trabajadorId) return;

  const citas = await api.getCitasTrabajador({ trabajador_id: trabajadorId });

  const reservadas = (citas || []).filter(c => (c.estado || "reservado") === "reservado");
  const completadas = (citas || []).filter(c => (c.estado || "") === "completada");
  const canceladas = (citas || []).filter(c => (c.estado || "") === "cancelada");

  const lastSeen = getLastSeenTrabajador();
  const nuevasReservadas = reservadas.filter(c => {
    const d = parseDbDate(c.created_at || c.updated_at);
    if (!d) return false;
    if (!lastSeen) return true;
    return d > lastSeen;
  });

  // KPI Reservadas + badge
  const kpiRes = document.getElementById("kpiReservadas");
  if (kpiRes) {
    const badge = nuevasReservadas.length > 0
      ? ` <span style="margin-left:8px;background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:999px;font-size:12px;font-weight:800;">
            +${nuevasReservadas.length}
          </span>`
      : "";
    kpiRes.innerHTML = `${reservadas.length}${badge}`;
  }

  document.getElementById("kpiCompletadas").textContent = completadas.length;
  document.getElementById("kpiCanceladas").textContent = canceladas.length;

  const badgeCard = document.getElementById("badgeNuevasReservadas");
  if (badgeCard) {
    badgeCard.innerHTML = nuevasReservadas.length > 0
      ? `<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:800;">
           🔔 ${nuevasReservadas.length} nueva${nuevasReservadas.length > 1 ? "s" : ""}
         </span>`
      : `<span style="color:#6b7280; font-size:12px;">Sin nuevas</span>`;
  }

  const btnCitas = document.getElementById("btnInicioTrabajadorCitas");
  if (btnCitas) {
    btnCitas.innerHTML = nuevasReservadas.length > 0
      ? `📝 Ver mis citas <span style="margin-left:8px;background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:999px;font-size:12px;font-weight:900;">
          ${nuevasReservadas.length}
        </span>`
      : `📝 Ver mis citas`;
  }

  const now = new Date();
  const proximas = reservadas
    .slice()
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .filter(c => new Date(`${c.fecha}T${(c.hora?.length === 5 ? c.hora : "00:00")}:00`) >= now)
    .slice(0, 6);

  document.getElementById("kpiProxima").textContent =
    proximas.length ? `${proximas[0].fecha} ${proximas[0].hora}` : "—";

  const cont = document.getElementById("listaProximas");
  if (!cont) return;

  if (!proximas.length) {
    cont.innerHTML = `<p style="color:#6b7280;">No tienes citas reservadas próximas.</p>`;
    return;
  }

  cont.innerHTML = `
    <div style="display:grid; gap:10px;">
      ${proximas.map(c => `
        <div style="
          display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;
          padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#fff;">
          <div>
            <div style="font-weight:800;">${c.fecha} · ${c.hora}</div>
            <div style="color:#6b7280; font-size:13px; margin-top:4px;">
              Cliente: <b>${c.cliente || "—"}</b> · Tel: ${c.telefono || "—"}
            </div>
            ${c.nota ? `<div style="margin-top:6px; color:#374151; font-size:13px;">📝 ${c.nota}</div>` : ""}
          </div>

          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn-primary" style="background:#111827;" data-id="${c.id}" data-accion="completar">✅ Completar</button>
            <button class="btn-danger" data-id="${c.id}" data-accion="cancelar">🚫 Cancelar</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  cont.querySelectorAll("button[data-id]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const accion = btn.getAttribute("data-accion");

      if (accion === "completar") await api.setCitaEstado({ id, estado: "completada" });
      if (accion === "cancelar") await api.setCitaEstado({ id, estado: "cancelada" });

      await cargarDashboardTrabajador();
    };
  });
}

/* =========================
   VACACIONES TRABAJADOR (30 días máx)
========================= */
async function cargarVacacionesTrabajador() {
  const trabajadorId = state.userId;
  if (!trabajadorId) return;

  const list = document.getElementById("vacacionesList");
  const rest = document.getElementById("vacRestantes");

  // ✅ seguridad: si no existe, que no reviente
  let vacs = [];
  try {
    vacs = await api.getVacaciones({ trabajador_id: trabajadorId });
  } catch (e) {
    console.error("getVacaciones falló:", e);
    if (list) {
      list.innerHTML = `
        <div style="padding:12px;border:1px dashed #e5e7eb;border-radius:12px;color:#6b7280;">
          No se pudieron cargar las vacaciones (falta API).
        </div>
      `;
    }
    return;
  }

  const usados = (vacs || []).length;
  const restantes = Math.max(0, 30 - usados);

  if (rest) rest.textContent = `Te quedan ${restantes} / 30 días`;

  if (!list) return;

  if (!vacs || vacs.length === 0) {
    list.innerHTML = `
      <div style="padding:12px;border:1px dashed #e5e7eb;border-radius:12px;color:#6b7280;">
        No tienes vacaciones registradas.
      </div>
    `;
  } else {
    list.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${(vacs || []).map(v => `
          <div style="display:flex;align-items:center;gap:8px;
                      padding:8px 10px;border:1px solid #e5e7eb;border-radius:999px;background:#fff;">
            <span style="font-size:13px;font-weight:700;">${v.fecha}</span>
            <button data-id="${v.id}" title="Eliminar día"
              style="border:none;background:transparent;cursor:pointer;font-size:14px;">✖</button>
          </div>
        `).join("")}
      </div>
    `;

    list.querySelectorAll("button[data-id]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-id");
        if (!confirm("¿Eliminar este día de vacaciones?")) return;

        await api.deleteVacacion({ id });
        await cargarVacacionesTrabajador();
      };
    });
  }

  // bind popup (solo una vez por render)
  const btnAbrir = document.getElementById("btnAbrirVacaciones");
  const popup = document.getElementById("popupVacaciones");
  const vacCancelar = document.getElementById("vacCancelar");
  const vacGuardar = document.getElementById("vacGuardar");

  if (btnAbrir) {
    btnAbrir.onclick = () => {
      // si no le quedan días, no abrir
      if (restantes <= 0) return alert("⚠️ Ya has consumido los 30 días de vacaciones.");
      popup.style.display = "flex";
    };
  }

  if (vacCancelar) vacCancelar.onclick = () => { popup.style.display = "none"; };

  if (vacGuardar) {
    vacGuardar.onclick = async () => {
      const desde = document.getElementById("vacDesde").value;
      const hasta = document.getElementById("vacHasta").value;

      if (!desde || !hasta) return alert("Selecciona desde y hasta.");

      // validación básica rango
      if (hasta < desde) return alert("⚠️ La fecha 'hasta' no puede ser menor que 'desde'.");

      const res = await api.addVacacionesRango({
        trabajador_id: trabajadorId,
        fechaInicio: desde,
        fechaFin: hasta
      });

      if (!res?.success) {
        alert(res?.message || "No se pudo guardar.");
        return;
      }

      popup.style.display = "none";

      // res.added = días añadidos, res.cancelled = citas canceladas (si lo implementas así en backend)
      const msg = `✅ Vacaciones guardadas (${res.added ?? "?"} días).` +
        (res.cancelled != null ? ` Citas canceladas: ${res.cancelled}.` : "");

      alert(msg);
      await cargarVacacionesTrabajador();
    };
  }
}
