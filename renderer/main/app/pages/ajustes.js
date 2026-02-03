import { state } from "../state.js";
import { api } from "../api.js";
import { loadSidebarAvatar, fileToBase64 } from "../helpers/dom.js";
import { logout } from "../navigation/logout.js";

export async function renderAjustes(main) {
  function escapeHtml(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function inputStyle() {
    return `
      width:100%;
      padding:10px 12px;
      border-radius:10px;
      border:1px solid #e5e7eb;
      outline:none;
      background:#fff;
    `;
  }

  function btnPrimary() {
    return `
      padding:10px 14px;
      border-radius:10px;
      border:0;
      background:#2563eb;
      color:white;
      cursor:pointer;
      font-weight:600;
    `;
  }

  function btnGhost() {
    return `
      padding:10px 14px;
      border-radius:10px;
      border:1px solid #e5e7eb;
      background:#fff;
      cursor:pointer;
      font-weight:600;
    `;
  }

  function btnDanger() {
    return `
      padding:10px 14px;
      border-radius:10px;
      border:0;
      background:#dc2626;
      color:white;
      cursor:pointer;
      font-weight:700;
    `;
  }

  function pintarAvatar(imagen, nombre) {
    const cont = document.getElementById("ajustesAvatar");
    if (!cont) return;

    if (imagen) {
      cont.innerHTML = `<img src="${imagen}" style="width:100%;height:100%;object-fit:cover;">`;
      return;
    }

    const inicial = (nombre?.trim()?.[0] || "?").toUpperCase();
    cont.textContent = inicial;
  }

  const userId = state.userId;
  const role = state.role;

  const username = localStorage.getItem("username") || "";
  const email = localStorage.getItem("email") || "";
  const imagen = localStorage.getItem("imagen") || "";

  const empresaSel = localStorage.getItem("seleccion_empresa") || "";
  const trabajadorSel = localStorage.getItem("seleccion_trabajador") || "";

  const prefNotifs = localStorage.getItem("pref_notifs") || "si";
  const prefFormatoHora = localStorage.getItem("pref_formato_hora") || "24";

  main.innerHTML = `
    <h1 class="title-page">Ajustes ⚙️</h1>

    <div style="display:grid; gap:16px; max-width:900px;">

      <div style="background:white; border-radius:14px; padding:16px; box-shadow:0 4px 10px rgba(0,0,0,.06);">
        <h2 style="margin-bottom:10px;">👤 Perfil</h2>

        <div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap;">
          <div id="ajustesAvatar" style="
              width:70px; height:70px; border-radius:999px;
              background:#e5e7eb; display:flex; align-items:center; justify-content:center;
              overflow:hidden; font-size:26px; font-weight:700; color:#111827;
          "></div>

          <div style="flex:1; min-width:260px;">
            <div style="display:grid; gap:10px;">
              <label>
                <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Usuario</div>
                <input id="aj_username" value="${escapeHtml(username)}" style="${inputStyle()}" />
              </label>

              <label>
                <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Email</div>
                <input id="aj_email" value="${escapeHtml(email)}" style="${inputStyle()}" />
              </label>

              <label>
                <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Foto (opcional)</div>
                <input id="aj_imagen" type="file" accept="image/*" style="width:100%;" />
              </label>

              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button id="btnGuardarPerfil" style="${btnPrimary()}">Guardar perfil</button>
                <button id="btnQuitarFoto" style="${btnGhost()}">Quitar foto</button>
              </div>

              <div style="font-size:12px; color:#6b7280;">
                Rol actual: <b>${escapeHtml(role)}</b>
              </div>

              <div id="perfilMsg" style="font-size:13px; margin-top:6px;"></div>
            </div>
          </div>
        </div>
      </div>

      <div style="background:white; border-radius:14px; padding:16px; box-shadow:0 4px 10px rgba(0,0,0,.06);">
        <h2 style="margin-bottom:10px;">🔒 Seguridad</h2>

        <div style="display:grid; gap:10px; max-width:520px;">
          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Contraseña actual</div>
            <input id="aj_oldPass" type="password" placeholder="********" style="${inputStyle()}" />
          </label>

          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Nueva contraseña</div>
            <input id="aj_newPass1" type="password" placeholder="********" style="${inputStyle()}" />
          </label>

          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Repetir nueva contraseña</div>
            <input id="aj_newPass2" type="password" placeholder="********" style="${inputStyle()}" />
          </label>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button id="btnCambiarPass" style="${btnPrimary()}">Cambiar contraseña</button>
            <button id="btnMostrarPass" style="${btnGhost()}">Mostrar / Ocultar</button>
          </div>

          <div id="passMsg" style="font-size:13px;"></div>
        </div>
      </div>

      <div style="background:white; border-radius:14px; padding:16px; box-shadow:0 4px 10px rgba(0,0,0,.06);">
        <h2 style="margin-bottom:10px;">🎛️ Preferencias</h2>

        <div style="display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Notificaciones</div>
            <select id="aj_notifs" style="${inputStyle()}">
              <option value="si" ${prefNotifs === "si" ? "selected" : ""}>Activadas</option>
              <option value="no" ${prefNotifs === "no" ? "selected" : ""}>Desactivadas</option>
            </select>
          </label>

          <label>
            <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Formato de hora</div>
            <select id="aj_formatoHora" style="${inputStyle()}">
              <option value="24" ${prefFormatoHora === "24" ? "selected" : ""}>24h</option>
              <option value="12" ${prefFormatoHora === "12" ? "selected" : ""}>12h</option>
            </select>
          </label>
        </div>

        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <button id="btnGuardarPrefs" style="${btnPrimary()}">Guardar preferencias</button>
          <button id="btnResetPrefs" style="${btnGhost()}">Restablecer</button>
        </div>

        <div id="prefsMsg" style="font-size:13px; margin-top:10px;"></div>
      </div>

      <div style="background:white; border-radius:14px; padding:16px; box-shadow:0 4px 10px rgba(0,0,0,.06);">
        <h2 style="margin-bottom:10px;">🧾 Sesión y datos</h2>

        <div style="display:grid; gap:10px;">
          <div style="font-size:13px; color:#374151;">
            • Empresa seleccionada: <b>${escapeHtml(empresaSel || "—")}</b><br>
            • Trabajador seleccionado: <b>${escapeHtml(trabajadorSel || "—")}</b>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button id="btnLimpiarSeleccion" style="${btnGhost()}">Limpiar selección (empresa/trabajador)</button>
            <button id="btnBorrarLocal" style="${btnGhost()}">Borrar preferencias locales</button>
            <button id="btnCerrarSesion" style="${btnDanger()}">Cerrar sesión</button>
          </div>

          <div style="font-size:12px; color:#6b7280;">
            Usuario ID: <b>${escapeHtml(userId || "—")}</b>
          </div>
        </div>
      </div>

    </div>
  `;

  pintarAvatar(imagen, username);

  const perfilMsg = document.getElementById("perfilMsg");

  document.getElementById("btnGuardarPerfil").onclick = async () => {
    try {
      if (!userId) return alert("❌ No hay sesión iniciada.");

      const newUser = document.getElementById("aj_username").value.trim();
      const newEmail = document.getElementById("aj_email").value.trim();
      const file = document.getElementById("aj_imagen").files?.[0];

      if (!newUser) return alert("El usuario no puede estar vacío.");

      let newImagen = localStorage.getItem("imagen") || "";
      if (file) newImagen = await fileToBase64(file);

      const res = await api.updateProfile({
        role,
        id: userId,
        username: newUser,
        email: newEmail,
        imagen: newImagen
      });

      if (!res?.success) {
        perfilMsg.textContent = "❌ " + (res?.message || "No se pudo guardar.");
        perfilMsg.style.color = "#b91c1c";
        return;
      }

      localStorage.setItem("username", newUser);
      localStorage.setItem("email", newEmail);
      localStorage.setItem("imagen", newImagen);

      pintarAvatar(newImagen, newUser);
      loadSidebarAvatar();

      document.getElementById("userName").textContent = newUser;
      document.getElementById("userEmail").textContent = newEmail;

      perfilMsg.textContent = "✅ Perfil guardado correctamente.";
      perfilMsg.style.color = "#15803d";
    } catch (e) {
      console.error(e);
      perfilMsg.textContent = "❌ Error guardando perfil. Mira consola (F12).";
      perfilMsg.style.color = "#b91c1c";
    }
  };

  document.getElementById("btnQuitarFoto").onclick = async () => {
    try {
      if (!userId) return alert("❌ No hay sesión iniciada.");

      const res = await api.updateProfile({
        role,
        id: userId,
        username: localStorage.getItem("username") || "",
        email: localStorage.getItem("email") || "",
        imagen: ""
      });

      if (!res?.success) return alert("❌ No se pudo quitar la foto.");

      localStorage.removeItem("imagen");
      pintarAvatar("", localStorage.getItem("username") || "");
      loadSidebarAvatar();

      perfilMsg.textContent = "✅ Foto eliminada.";
      perfilMsg.style.color = "#15803d";
    } catch (e) {
      console.error(e);
      alert("❌ Error quitando foto.");
    }
  };

  let passVisible = false;
  const passMsg = document.getElementById("passMsg");

  document.getElementById("btnMostrarPass").onclick = () => {
    passVisible = !passVisible;
    document.getElementById("aj_oldPass").type = passVisible ? "text" : "password";
    document.getElementById("aj_newPass1").type = passVisible ? "text" : "password";
    document.getElementById("aj_newPass2").type = passVisible ? "text" : "password";
  };

  document.getElementById("btnCambiarPass").onclick = async () => {
    try {
      if (!userId) return alert("❌ No hay sesión iniciada.");

      const oldPass = document.getElementById("aj_oldPass").value.trim();
      const p1 = document.getElementById("aj_newPass1").value.trim();
      const p2 = document.getElementById("aj_newPass2").value.trim();

      passMsg.textContent = "";
      passMsg.style.color = "#111827";

      if (!oldPass || !p1 || !p2) {
        passMsg.textContent = "⚠️ Completa todos los campos.";
        passMsg.style.color = "#b91c1c";
        return;
      }

      if (p1 !== p2) {
        passMsg.textContent = "⚠️ Las nuevas contraseñas no coinciden.";
        passMsg.style.color = "#b91c1c";
        return;
      }

      if (p1.length < 6) {
        passMsg.textContent = "⚠️ La nueva contraseña debe tener al menos 6 caracteres.";
        passMsg.style.color = "#b91c1c";
        return;
      }

      const res = await api.updatePassword({
        role,
        id: userId,
        oldPassword: oldPass,
        newPassword: p1
      });

      if (!res?.success) {
        passMsg.textContent = "❌ " + (res?.message || "No se pudo cambiar.");
        passMsg.style.color = "#b91c1c";
        return;
      }

      document.getElementById("aj_oldPass").value = "";
      document.getElementById("aj_newPass1").value = "";
      document.getElementById("aj_newPass2").value = "";

      passMsg.textContent = "✅ Contraseña actualizada correctamente.";
      passMsg.style.color = "#15803d";
    } catch (e) {
      console.error(e);
      passMsg.textContent = "❌ Error cambiando contraseña. Mira consola (F12).";
      passMsg.style.color = "#b91c1c";
    }
  };

  document.getElementById("btnGuardarPrefs").onclick = () => {
    localStorage.setItem("pref_notifs", document.getElementById("aj_notifs").value);
    localStorage.setItem("pref_formato_hora", document.getElementById("aj_formatoHora").value);
    alert("✅ Preferencias guardadas.");
  };

  document.getElementById("btnResetPrefs").onclick = () => {
    ["pref_notifs", "pref_formato_hora"].forEach(k => localStorage.removeItem(k));
    alert("✅ Preferencias restablecidas.");
    renderAjustes(main);
  };

  document.getElementById("btnLimpiarSeleccion").onclick = () => {
    localStorage.removeItem("seleccion_empresa");
    localStorage.removeItem("seleccion_trabajador");
    alert("✅ Selección eliminada.");
    renderAjustes(main);
  };

  document.getElementById("btnBorrarLocal").onclick = () => {
    ["pref_tema", "pref_notifs", "pref_formato_hora"].forEach(k => localStorage.removeItem(k));
    alert("✅ Preferencias locales borradas.");
    renderAjustes(main);
  };

  document.getElementById("btnCerrarSesion").onclick = () => logout();
}
