import { state } from "../state.js";
import { api } from "../api.js";

export function cargarInicioBasico() {
  const main = document.getElementById("mainContent");

  main.innerHTML = `
    <h1>Bienvenido 👋</h1>
    <p>Selecciona una opción del menú para comenzar.</p>
  `;
}

export function cargarInicioAdmin() {
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

async function cargarDashboard() {
  const empresas = await api.getEmpresas();
  const trabajadores = await api.getTrabajadores();
  const clientes = await api.getClientes();
  const citas = await api.getCitas("ALL");

  document.getElementById("dashEmpresas").textContent = empresas.length;
  document.getElementById("dashTrabajadores").textContent = trabajadores.length;
  document.getElementById("dashClientes").textContent = clientes.length;

  const hoy = new Date().toISOString().split("T")[0];

  document.getElementById("dashCitasHoy").textContent =
    citas.filter(c => (c.estado || "reservado") === "reservado" && c.fecha === hoy).length;

  await cargarGraficaSemanal();
  await cargarAlertas();
  await cargarActividadReciente();
}

async function cargarGraficaSemanal() {
  const citas = await api.getCitas("ALL");

  const fechas = [];
  const cantidades = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const fechaStr = d.toISOString().split("T")[0];

    fechas.push(fechaStr);
    cantidades.push(citas.filter(c => c.fecha === fechaStr).length);
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

  const empresas = await api.getEmpresas();
  const trabajadores = await api.getTrabajadores();
  const citas = await api.getCitas("ALL");

  let alertas = [];

  // Trabajadores sin empresa
  const trabajadoresSinEmpresa = trabajadores.filter(t => {
    return (
      t.empresa_id === null ||
      t.empresa_id === undefined ||
      t.empresa_id === "" ||
      !empresas.some(emp => String(emp.id) === String(t.empresa_id))
    );
  });

  if (trabajadoresSinEmpresa.length > 0) {
    alertas.push(`${trabajadoresSinEmpresa.length} trabajadores sin empresa asignada`);
  }

  // Empresas sin trabajadores
  empresas.forEach(emp => {
    const cuenta = trabajadores.filter(t => String(t.empresa_id) === String(emp.id)).length;
    if (cuenta === 0) {
      alertas.push(`La empresa "${emp.nombre}" no tiene trabajadores.`);
    }
  });

  // Citas pasadas sin nota
  const hoy = new Date().toISOString().split("T")[0];
  const citasPasadasSinNota = citas.filter(c =>
    c.fecha < hoy && (!c.nota || c.nota.trim() === "")
  );

  if (citasPasadasSinNota.length > 0) {
    alertas.push(`${citasPasadasSinNota.length} citas pasadas no tienen nota añadida.`);
  }

  if (alertas.length === 0) {
    lista.innerHTML = `<p>No hay alertas importantes 🎉</p>`;
    return;
  }

  lista.innerHTML = alertas.map(a => `<div class="alert-item">⚠️ ${a}</div>`).join("");
}

async function cargarActividadReciente() {
  const citas = await api.getCitas("ALL");
  const ultimas = citas.slice(0, 10);

  const actividades = ultimas.map(c => {
    const estado = (c.estado || "reservado").toLowerCase();
    const when = c.updated_at || c.created_at || c.fecha;

    let texto = `📅 Cita creada: ${c.cliente || "—"} (${c.fecha} - ${c.hora})`;

    if (estado === "cancelada") texto = `🚫 Cita cancelada: ${c.cliente || "—"} (${c.fecha} - ${c.hora})`;
    if (estado === "completada") texto = `✅ Cita completada: ${c.cliente || "—"} (${c.fecha} - ${c.hora})`;

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
