import { state } from "../state.js";
import { api } from "../api.js";

export async function renderCitas(main) {
  const role = (state.role || "").toLowerCase();
  const userId = String(state.userId || "");
  const username = (state.username || "").trim().toLowerCase();

  const esAdmin = role === "admin";
  const esTrabajador = role === "trabajador" || role === "trabajadores";
  const esCliente = role === "cliente";

  let citas = [];
  let empresas = [];
  let trabajadores = [];

  // ============================
  // CARGA DATOS SEGÚN ROL
  // ============================
  if (esTrabajador) {
    citas = await api.getCitasTrabajador({ trabajador_id: userId });
    empresas = await api.getEmpresas();
    trabajadores = await api.getTrabajadores();
  } else {
    citas = await api.getCitas("ALL");
    empresas = await api.getEmpresas();
    trabajadores = await api.getTrabajadores();
  }

  // ============================
  // FILTRO EXTRA CLIENTE:
  // ============================
  if (esCliente) {
    citas = (citas || []).filter(c => {
      const estado = (c.estado || "reservado").toLowerCase();

      const cid = c.cliente_id != null ? String(c.cliente_id) : "";
      const nombreCita = (c.cliente || "").trim().toLowerCase();

      const dueño = (cid && cid === userId) || (!!nombreCita && nombreCita === username);

      return dueño && estado === "reservado";
    });
  }

  // ============================
  // UI
  // ============================
  main.innerHTML = `
    <h1>CITAS</h1>

    ${esTrabajador ? `
      <div style="display:flex; align-items:center; gap:10px; margin: 10px 0 0;">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="toggleHistorial" />
          <span>Ver historial (completadas)</span>
        </label>
      </div>
    ` : ""}

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

  // Ocultar filtros según rol
  if (esTrabajador) {
    document.getElementById("fEmpresa").style.display = "none";
    document.getElementById("fTrabajador").style.display = "none";
  }

  if (esCliente) {
    document.getElementById("fEmpresa").style.display = "none";
    document.getElementById("fTrabajador").style.display = "none";
    document.getElementById("fEstado").style.display = "none";
    document.getElementById("fTexto").style.display = "none";
  }

  const body = document.getElementById("tablaCitasBody");

  // helpers
  function nombreEmpresa(id) {
    return empresas.find(e => String(e.id) === String(id))?.nombre || "—";
  }
  function nombreTrabajador(id) {
    return trabajadores.find(t => String(t.id) === String(id))?.username || "—";
  }
  function badgeEstado(estado) {
    const e = (estado || "reservado").toLowerCase();
    const styles =
      e === "cancelada" ? "background:#e5e7eb;color:#374151;" :
      e === "completada" ? "background:#dcfce7;color:#166534;" :
      "background:#fee2e2;color:#991b1b;";
    return `<span style="padding:6px 10px; border-radius:999px; font-size:12px; ${styles}">${e}</span>`;
  }

  // ============================
  // PINTAR TABLA
  // ============================
  function pintar(lista) {
    body.innerHTML = "";

    if (!lista || lista.length === 0) {
      body.innerHTML = `<tr><td colspan="8" style="padding:14px;">No hay citas.</td></tr>`;
      return;
    }

    lista
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
      .forEach(c => {
        const empresaId = c.empresa_id ?? c.empresaId;
        const trabajadorId = c.trabajador_id ?? c.userId ?? c.trabajadorId;
        const estado = (c.estado || "reservado").toLowerCase();

        let accionesHTML = "";

        if (esCliente) {
          // cliente: solo cancelar su cita reservada
          accionesHTML = `<button data-id="${c.id}" data-accion="cancelar">🚫 Cancelar</button>`;
        } else if (esTrabajador) {
          if (estado === "completada") {
            accionesHTML = `<button data-id="${c.id}" data-accion="borrar">🗑️</button>`;
          } else {
            accionesHTML = `
              <button data-id="${c.id}" data-accion="completar">✅</button>
              <button data-id="${c.id}" data-accion="cancelar">🚫</button>
              <button data-id="${c.id}" data-accion="borrar">🗑️</button>
            `;
          }
        } else {
          // admin
          accionesHTML = `
            <button data-id="${c.id}" data-accion="completar">✅</button>
            <button data-id="${c.id}" data-accion="cancelar">🚫</button>
            <button data-id="${c.id}" data-accion="borrar">🗑️</button>
          `;
        }

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
            ${accionesHTML}
          </td>
        `;
        body.appendChild(tr);
      });

    // estilos + handlers
    body.querySelectorAll("button").forEach(btn => {
      btn.style.border = "1px solid #ddd";
      btn.style.borderRadius = "8px";
      btn.style.padding = "6px 10px";
      btn.style.cursor = "pointer";
      btn.style.background = "white";

      btn.onclick = async () => {
        const id = btn.getAttribute("data-id");
        const accion = btn.getAttribute("data-accion");

        if (accion === "completar") {
          await api.setCitaEstado({ id, estado: "completada" });
        }

        if (accion === "cancelar") {
          await api.setCitaEstado({ id, estado: "cancelada" });
        }

        if (accion === "borrar") {
          if (!confirm("¿Eliminar definitivamente la cita?")) return;
          await api.deleteCita(id);
        }

        await recargarYAplicar();
      };
    });
  }

  // ============================
  // APLICAR FILTROS + HISTORIAL TRABAJADOR
  // ============================
  function aplicarFiltros(lista) {
    const fFecha = document.getElementById("fFecha")?.value || "";
    const fEstado = document.getElementById("fEstado")?.value || "";
    const fEmpresa = document.getElementById("fEmpresa")?.value || "";
    const fTrabajador = document.getElementById("fTrabajador")?.value || "";
    const fTexto = (document.getElementById("fTexto")?.value || "").toLowerCase();

    const verHistorial = esTrabajador ? (document.getElementById("toggleHistorial")?.checked || false) : false;

    const filtrada = (lista || []).filter(c => {
      const empresaId = String(c.empresa_id ?? c.empresaId ?? "");
      const trabajadorId = String(c.trabajador_id ?? c.userId ?? "");
      const estado = (c.estado || "reservado").toLowerCase();

      if (esTrabajador) {
        if (!verHistorial && estado === "completada") return false;
        if (verHistorial && estado !== "completada") return false;
      }

      if (fFecha && c.fecha !== fFecha) return false;

      if (!esCliente && fEstado && estado !== fEstado) return false;

      if (esAdmin) {
        if (fEmpresa && empresaId !== String(fEmpresa)) return false;
        if (fTrabajador && trabajadorId !== String(fTrabajador)) return false;
      }

      if (!esCliente && fTexto && !(c.cliente || "").toLowerCase().includes(fTexto)) return false;

      return true;
    });

    pintar(filtrada);
  }

  async function recargarYAplicar() {
    if (esTrabajador) {
      citas = await api.getCitasTrabajador({ trabajador_id: userId });
    } else {
      citas = await api.getCitas("ALL");
    }

    if (esCliente) {
      citas = (citas || []).filter(c => {
        const estado = (c.estado || "reservado").toLowerCase();

        const cid = c.cliente_id != null ? String(c.cliente_id) : "";
        const nombreCita = (c.cliente || "").trim().toLowerCase();

        const dueño = (cid && cid === userId) || (!!nombreCita && nombreCita === username);

        return dueño && estado === "reservado";
      });
    }

    aplicarFiltros(citas);
  }

  // listeners
  ["fFecha", "fEstado", "fEmpresa", "fTrabajador", "fTexto"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => aplicarFiltros(citas));
  });

  if (esTrabajador) {
    document.getElementById("toggleHistorial")?.addEventListener("change", () => {
      document.getElementById("fEstado").value = "";
      aplicarFiltros(citas);
    });
  }

  // primera carga
  aplicarFiltros(citas);
}
