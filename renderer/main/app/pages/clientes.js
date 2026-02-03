import { state } from "../state.js";
import { api } from "../api.js";

export async function renderClientes(main) {
  if (state.role !== "admin" && state.role !== "trabajador") {
    main.innerHTML = "<h1>Acceso denegado 🔒</h1>";
    return;
  }

  const clientes = await api.getClientes();
  const citas = await api.getCitas("ALL");

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

  const listaDiv = document.getElementById("clientesListaInner");
  const contenidoDiv = document.getElementById("clienteCitasContenido");
  const tituloCliente = document.getElementById("clienteTitulo");

  if (!clientes || clientes.length === 0) {
    listaDiv.innerHTML = `<p>No hay clientes.</p>`;
    return;
  }

  clientes.forEach(cli => {
    const nombre = cli.nombre || cli.username || "";

    const item = document.createElement("div");
    item.className = "cliente-item";
    item.textContent = nombre;

    item.onclick = () => {
      tituloCliente.textContent = `Citas de ${nombre}`;

      const citasCliente = citas.filter(c => (c.cliente || "").trim() === nombre.trim());

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
              <th>Usuario</th>
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
            <td>${c.username || ""}</td>
          </tr>
        `;
      });

      html += "</tbody></table>";
      contenidoDiv.innerHTML = html;
    };

    listaDiv.appendChild(item);
  });
}
