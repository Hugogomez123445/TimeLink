console.log("renderer cargado");
console.log("window.api =", window.api);

let isLogin = true;
let isAdminMode = false;
let isWorkerRegister = false;

const title = document.getElementById("title");
const actionBtn = document.getElementById("actionBtn");
const btnText = document.getElementById("btnText");
const loader = document.getElementById("loader");
const toggleText = document.getElementById("toggleText");
const emailGroup = document.getElementById("email-group");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordError = document.getElementById("passwordError");
const strengthContainer = document.getElementById("passwordStrength");
const strengthBar = document.getElementById("strengthBar");

// Caja de portales 
const accessButtons = document.getElementById("accessButtons");

// Popup trabajador referencias
const workerPopupTitle = document.getElementById("workerPopupTitle");
const workerEmail = document.getElementById("workerEmail");
const toggleWorkerMode = document.getElementById("toggleWorkerMode");
const loginWorkerBtn = document.getElementById("loginWorkerBtn");

// Helper LOAD
function setLoading(loading) {
  if (loading) {
    actionBtn.disabled = true;
    loader.style.display = "inline-block";
    btnText.textContent = isLogin ? "Entrando..." : "Registrando...";
  } else {
    actionBtn.disabled = false;
    loader.style.display = "none";
    btnText.textContent = isLogin ? "Entrar" : "Registrarse";
  }
}

// Guardar las sesiones
function saveSession(user, role) {
  localStorage.setItem("userId", user.id);
  localStorage.setItem("username", user.username || user.nombre || "");
  localStorage.setItem("email", user.email || "");
  localStorage.setItem("role", role);
  localStorage.setItem("imagen", user.imagen || "");
  if (user.empresa_id != null) localStorage.setItem("empresa_id", user.empresa_id);
}

// mostrar/ocultar portales según estado
function syncPortalesUI() {
  if (!accessButtons) return;
  accessButtons.style.display = isLogin ? "flex" : "none";
}

// Cambiar entre login y registro en el inicio de cliente
toggleText.addEventListener("click", () => {
  if (isAdminMode) return;

  const container = document.querySelector(".container");
  container.style.opacity = "0.5";

  setTimeout(() => {
    isLogin = !isLogin;

    if (isLogin) {
      title.textContent = "Iniciar Sesión";
      btnText.textContent = "Entrar";
      toggleText.textContent = "¿No tienes cuenta? Regístrate";

      emailGroup.style.display = "none";
      strengthContainer.style.display = "none";
      passwordError.style.display = "none";
    } else {
      title.textContent = "Crear Cuenta";
      btnText.textContent = "Registrarse";
      toggleText.textContent = "¿Ya tienes cuenta? Inicia sesión";

      emailGroup.style.display = "block";
      strengthContainer.style.display = "block";
    }

    syncPortalesUI();

    container.style.opacity = "1";
  }, 150);
});

// LOGIN/REGISTER CLIENTE
actionBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value.trim();
  const email = emailInput.value.trim();

  if (!username || !password) {
    alert("Por favor, completa todos los campos.");
    return;
  }

  if (isAdminMode) return;

  // LOGIN CLIENTE
  if (isLogin) {
    try {
      setLoading(true);

      if (!window.api?.loginCliente) {
        alert("Falta loginCliente en preload.js");
        return;
      }

      const result = await window.api.loginCliente({ username, password });

      if (result.success) {
        saveSession(result.user, "cliente");
        window.location.href = "./main/mainApp.html";
      } else {
        const card = document.querySelector(".container");
        card.classList.add("shake");
        setTimeout(() => card.classList.remove("shake"), 400);
        alert(result.message || "Credenciales incorrectas.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  // REGISTRO CLIENTE
  else {
    if (!email) {
      alert("Introduce tu correo electrónico.");
      return;
    }

    let errors = [];
    if (password.length < 8) errors.push("• Mínimo 8 caracteres.");
    if (!/[0-9]/.test(password)) errors.push("• Debe contener un número.");
    if (!/[!@#$%^&*(),.?\":{}|<>_\-]/.test(password)) errors.push("• Debe contener un símbolo especial.");

    if (errors.length > 0) {
      passwordError.innerHTML = errors.join("<br>");
      passwordError.style.display = "block";
      return;
    }

    try {
      setLoading(true);

      if (!window.api?.registerCliente) {
        alert("Falta registerCliente en preload.js");
        return;
      }

      const result = await window.api.registerCliente({ username, email, password });

      if (result.success) {
        alert("Usuario registrado correctamente.");

        //volvemos a login automáticamente
        isLogin = true;

        title.textContent = "Iniciar Sesión";
        btnText.textContent = "Entrar";
        toggleText.textContent = "¿No tienes cuenta? Regístrate";
        emailGroup.style.display = "none";
        strengthContainer.style.display = "none";
        passwordError.style.display = "none";

        // portales vuelven a mostrarse
        syncPortalesUI();
      } else {
        alert(result.message || "No se pudo registrar.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al registrar usuario.");
    } finally {
      setLoading(false);
    }
  }
});

// Requisito de contraseña en cliente
passwordInput.addEventListener("input", () => {
  if (isLogin || isAdminMode) {
    passwordError.style.display = "none";
    strengthContainer.style.display = "none";
    return;
  }

  const val = passwordInput.value;
  let strength = 0;

  if (val.length >= 8) strength++;
  if (/[0-9]/.test(val)) strength++;
  if (/[!@#$%^&*(),.?\":{}|<>_\-]/.test(val)) strength++;
  if (/[A-Z]/.test(val)) strength++;

  strengthContainer.style.display = val.length ? "block" : "none";

  if (strength <= 1) {
    strengthBar.style.width = "33%";
    strengthBar.style.background = "#ef4444";
  } else if (strength === 2) {
    strengthBar.style.width = "66%";
    strengthBar.style.background = "#f59e0b";
  } else {
    strengthBar.style.width = "100%";
    strengthBar.style.background = "#22c55e";
  }
});

// POPUP ADMIN
document.getElementById("adminAccess").addEventListener("click", () => {
  document.getElementById("popupWorker").style.display = "none";
  document.getElementById("popupAdmin").style.display = "flex";
});

document.getElementById("cancelAdmin").onclick = () => {
  document.getElementById("popupAdmin").style.display = "none";
};

document.getElementById("loginAdminBtn").addEventListener("click", async () => {
  const adminUser = document.getElementById("adminUser").value.trim();
  const adminPass = document.getElementById("adminPass").value.trim();

  if (!adminUser || !adminPass) return alert("Completa todos los campos.");

  if (!window.api?.loginAdmin) return alert("Falta loginAdmin en preload.js");

  const result = await window.api.loginAdmin({ username: adminUser, password: adminPass });

  if (!result.success) return alert(result.message || "Credenciales incorrectas.");

  saveSession(result.user, "admin");
  window.location.href = "./main/mainApp.html";
});

//POPUP TRABAJADOR 
document.getElementById("workerAccess").addEventListener("click", () => {
  document.getElementById("popupAdmin").style.display = "none";
  document.getElementById("popupWorker").style.display = "flex";

  // reset modo
  isWorkerRegister = false;
  workerPopupTitle.textContent = "Acceso Trabajador";
  workerEmail.style.display = "none";
  loginWorkerBtn.textContent = "Entrar";
  toggleWorkerMode.textContent = "¿No tienes cuenta? Regístrate (pendiente de aprobación)";
});

document.getElementById("cancelWorker").onclick = () => {
  document.getElementById("popupWorker").style.display = "none";
};

toggleWorkerMode.addEventListener("click", () => {
  isWorkerRegister = !isWorkerRegister;

  if (isWorkerRegister) {
    workerPopupTitle.textContent = "Registro Trabajador";
    workerEmail.style.display = "block";
    loginWorkerBtn.textContent = "Solicitar alta";
    toggleWorkerMode.textContent = "¿Ya tienes cuenta? Inicia sesión";
  } else {
    workerPopupTitle.textContent = "Acceso Trabajador";
    workerEmail.style.display = "none";
    loginWorkerBtn.textContent = "Entrar";
    toggleWorkerMode.textContent = "¿No tienes cuenta? Regístrate (pendiente de aprobación)";
  }
});

loginWorkerBtn.addEventListener("click", async () => {
  const user = document.getElementById("workerUser").value.trim();
  const pass = document.getElementById("workerPass").value.trim();
  const email = document.getElementById("workerEmail").value.trim();

  if (!user || !pass) return alert("Completa usuario y contraseña.");

  // REGISTRO trabajador
  if (isWorkerRegister) {
    if (!email) return alert("Introduce un email.");
    if (!window.api?.registerTrabajador) return alert("Falta registerTrabajador en preload.js");

    const res = await window.api.registerTrabajador({ username: user, email, password: pass });

    if (!res.success) return alert(res.message || "No se pudo registrar.");

    alert("Solicitud enviada. Un administrador debe aprobar tu cuenta.");
    document.getElementById("popupWorker").style.display = "none";
    return;
  }

  // LOGIN trabajador
  if (!window.api?.loginTrabajador) return alert("Falta loginTrabajador en preload.js");

  const result = await window.api.loginTrabajador({ username: user, password: pass });

  if (!result.success) return alert(result.message || "Credenciales incorrectas.");

  saveSession(result.user, "trabajador");
  window.location.href = "./main/mainApp.html";
});

// Mostrar / ocultar contraseña
document.getElementById("togglePassword").addEventListener("click", () => {
  const hidden = passwordInput.type === "password";
  passwordInput.type = hidden ? "text" : "password";
  togglePassword.textContent = hidden ? "🙈" : "👁️";
});

syncPortalesUI();
