import { state } from "../state.js";
import { api } from "../api.js";

export async function renderClientes(main) {
  const role = (state.role || "").toLowerCase();

  // ✅ Cliente normal: no debería entrar aquí
  if (role === "cliente") {
    main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
    return;
  }

  // ============================
  // ADMIN 
  // ============================
  if (role === "admin") {
    const clientes = await api.getClientes();
    const citas = await api.getCitas("ALL");
    const empresas = await api.getEmpresas();

    main.innerHTML = `
      <h1>CLIENTES</h1>

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

    if (!clientes || clientes.length === 0) {
      listaDiv.innerHTML = `<p>No hay clientes.</p>`;
      return;
    }

    function nombreEmpresa(id) {
      return empresas.find(e => String(e.id) === String(id))?.nombre || "—";
    }

    clientes.forEach(cli => {
      const nombre = cli.username || cli.nombre || "";

      const item = document.createElement("div");
      item.className = "cliente-item";
      item.textContent = nombre;

      item.onclick = () => {
        tituloCliente.textContent = `Citas de ${nombre}`;

        const citasCliente = (citas || []).filter(c =>
          (c.cliente || "").trim() === nombre.trim()
        );

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
                <th>Empresa</th>
                <th>Estado</th>
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
              <td>${nombreEmpresa(c.empresa_id ?? c.empresaId)}</td>
              <td>${c.estado || "reservado"}</td>
            </tr>
          `;
        });

        html += `</tbody></table>`;
        contenidoDiv.innerHTML = html;
      };

      listaDiv.appendChild(item);
    });

    return;
  }

  // ============================
  // TRABAJADOR -> solo clientes que han reservado en SU EMPRESA
  // ============================
  if (role === "trabajador" || role === "trabajadores") {
    const trabajadorId = state.userId;

    // 1) saber su empresa_id
    let empresaId = localStorage.getItem("empresa_id") || null;

    if (!empresaId) {
      const trabajadores = await api.getTrabajadores();
      const yo = (trabajadores || []).find(t => String(t.id) === String(trabajadorId));
      empresaId = yo?.empresa_id || null;
      if (empresaId) localStorage.setItem("empresa_id", empresaId);
    }

    if (!empresaId) {
      main.innerHTML = `
        <h1>CLIENTES</h1>
        <p style="margin-top:10px;color:#b91c1c;">
          ⚠️ Tu usuario trabajador no tiene empresa asignada. Pide al admin que te asigne una.
        </p>
      `;
      return;
    }

    // 2) coger citas de ESA empresa
    const citasAll = await api.getCitas("ALL");
    const citasEmpresa = (citasAll || []).filter(c => {
      const eId = c.empresa_id ?? c.empresaId;
      const estado = (c.estado || "reservado").toLowerCase();
      // “han reservado” => quitamos canceladas (si quieres incluirlas, elimina esta línea)
      if (estado === "cancelada") return false;
      return String(eId) === String(empresaId);
    });

    // 3) sacar clientes únicos por nombre
    const clientesUnicos = Array.from(
      new Set(
        citasEmpresa
          .map(c => (c.cliente || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    main.innerHTML = `
      <h1>CLIENTES</h1>

      <div class="clientes-layout">
        <div class="clientes-card">
          <h3>Clientes de tu empresa</h3>
          <p class="sub">Solo aparecen clientes que han reservado en tu empresa.</p>

          <input
            id="buscarCliente"
            placeholder="🔎 Buscar cliente..."
            style="width:100%; padding:10px; border-radius:10px; border:1px solid #e5e7eb; margin:10px 0;"
          >

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
    const buscar = document.getElementById("buscarCliente");

    function pintarLista(listaNombres) {
      listaDiv.innerHTML = "";

      if (!listaNombres || listaNombres.length === 0) {
        listaDiv.innerHTML = `<p>No hay clientes con reservas en tu empresa.</p>`;
        return;
      }

      listaNombres.forEach(nombre => {
        const item = document.createElement("div");
        item.className = "cliente-item";
        item.textContent = nombre;

        item.onclick = () => {
          tituloCliente.textContent = `Citas de ${nombre}`;

          const citasCliente = citasEmpresa.filter(c =>
            (c.cliente || "").trim() === nombre.trim()
          );

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
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
          `;

          citasCliente
            .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
            .forEach(c => {
              html += `
                <tr>
                  <td>${c.fecha}</td>
                  <td>${c.hora}</td>
                  <td>${c.telefono || ""}</td>
                  <td>${c.nota || ""}</td>
                  <td>${c.estado || "reservado"}</td>
                </tr>
              `;
            });

          html += `</tbody></table>`;
          contenidoDiv.innerHTML = html;
        };

        listaDiv.appendChild(item);
      });
    }

    pintarLista(clientesUnicos);

    buscar.addEventListener("input", () => {
      const q = buscar.value.toLowerCase();
      const filtrados = clientesUnicos.filter(n => n.toLowerCase().includes(q));
      pintarLista(filtrados);
    });

    return;
  }

  // fallback
  main.innerHTML = "<h1>Acceso denegado</h1>";
}
