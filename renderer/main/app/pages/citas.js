import { state } from "../state.js";
import { api } from "../api.js";

export async function renderCitas(main) {
  const role = state.role;
  const userId = state.userId;

  let citas = [];
  let empresas = [];
  let trabajadores = [];

  if (role === "trabajador") {
    citas = await api.getCitasTrabajador({ trabajador_id: userId });
    trabajadores = await api.getTrabajadores();
    empresas = await api.getEmpresas();
  } else {
    citas = await api.getCitas("ALL");
    empresas = await api.getEmpresas();
    trabajadores = await api.getTrabajadores();
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
    document.getElementById("fEmpresa").style.display = "none";
    document.getElementById("fTrabajador").style.display = "none";
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

    if (!lista || lista.length === 0) {
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

    body.querySelectorAll("button").forEach(btn => {
      btn.style.border = "1px solid #ddd";
      btn.style.borderRadius = "8px";
      btn.style.padding = "6px 10px";
      btn.style.cursor = "pointer";

      btn.onclick = async () => {
        const id = btn.getAttribute("data-id");
        const accion = btn.getAttribute("data-accion");

        if (accion === "completar") await api.setCitaEstado({ id, estado: "completada" });
        if (accion === "cancelar") await api.setCitaEstado({ id, estado: "cancelada" });
        if (accion === "borrar") {
          if (!confirm("¿Eliminar definitivamente la cita?")) return;
          await api.deleteCita(id);
        }

        const nuevas = await api.getCitas("ALL");
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

    const filtrada = (lista || []).filter(c => {
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

  ["fFecha", "fEstado", "fEmpresa", "fTrabajador", "fTexto"].forEach(id => {
    document.getElementById(id).addEventListener("input", async () => {
      const nuevas = await api.getCitas("ALL");
      aplicarFiltros(nuevas);
    });
  });

  pintar(citas);
}
