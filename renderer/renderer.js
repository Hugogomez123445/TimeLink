console.log("renderer cargado");
console.log("window.api =", window.api);

let isLogin = true;
let isAdminMode = false;

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


// Helper loader
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

// Cambiar entre login y registro
toggleText.addEventListener("click", () => {
  if (isAdminMode) return; // El admin no puede registrarse

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

    container.style.opacity = "1";
  }, 150);
});

// Acción: login / registro
actionBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value.trim();
  const email = emailInput.value.trim();

  if (!username || !password) {
    alert("Por favor, completa todos los campos.");
    return;
  }

  // --- LOGIN ADMIN NORMAL (Inicia sesión pero con rol admin)
  if (isAdminMode) {
    const result = await window.api.loginUser({ username, password });

    if (!result.success) {
      alert("Credenciales de administrador incorrectas.");
      return;
    }

    if (result.user.role !== "admin") {
      alert("Este usuario no es administrador.");
      return;
    }

    // Guardar info admin
    localStorage.setItem("userId", result.user.id);
    localStorage.setItem("username", result.user.username);
    localStorage.setItem("email", result.user.email);
    localStorage.setItem("role", result.user.role);
    localStorage.setItem("imagen", user.imagen || "");


    window.location.href = "./main/mainApp.html";
    return;
  }

  // ========== LOGIN CLIENTE ==========
  if (isLogin) {
    try {
      setLoading(true);
      const result = await window.api.loginUser({ username, password });

      if (result.success) {

        if (result.user.role === "admin") {
          alert("Los administradores deben iniciar sesión desde el Portal Admin.");
          setLoading(false);
          return;
        }

        if (result.user.role === "trabajador") {
          alert("Los trabajadores deben iniciar sesión desde el Portal Trabajador.");
          setLoading(false);
          return;
        }

        // Guardar datos usuario normal
        localStorage.setItem("userId", result.user.id);
        localStorage.setItem("username", result.user.username);
        localStorage.setItem("email", result.user.email);
        localStorage.setItem("role", result.user.role);

        window.location.href = "./main/mainApp.html";

      } else {
        const card = document.querySelector(".container");
        card.classList.add("shake");
        setTimeout(() => card.classList.remove("shake"), 400);
        alert(result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }



  // ========== REGISTRO CLIENTE ==========
  else {
    if (!email) {
      alert("Introduce tu correo electrónico.");
      return;
    }

    // Validación contraseña
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
      const result = await window.api.registerUser({
        username,
        email,
        password,
        role: "cliente"
      });

      if (result.success) {
        alert("Usuario registrado correctamente.");
        isLogin = true;
        title.textContent = "Iniciar Sesión";
        btnText.textContent = "Entrar";
        toggleText.textContent = "¿No tienes cuenta? Regístrate";
        emailGroup.style.display = "none";
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error al registrar usuario.");
    } finally {
      setLoading(false);
    }
  }
});

// Fuerza de contraseña
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

  if (val.length > 0) {
    strengthContainer.style.display = "block";
  } else {
    strengthContainer.style.display = "none";
  }

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

// --- POPUP ADMIN ---
document.getElementById("adminAccess").addEventListener("click", () => {
  document.getElementById("popupAdmin").style.display = "flex";
});

// Cerrar popup admin
document.getElementById("cancelAdmin").onclick = () => {
  document.getElementById("popupAdmin").style.display = "none";
};

// LOGIN ADMIN DESDE POPUP
document.getElementById("loginAdminBtn").addEventListener("click", async () => {
  const adminUser = document.getElementById("adminUser").value.trim();
  const adminPass = document.getElementById("adminPass").value.trim();

  if (!adminUser || !adminPass) {
    alert("Completa todos los campos.");
    return;
  }

  const result = await window.api.loginUser({ username: adminUser, password: adminPass });

  if (!result.success) {
    alert("Credenciales incorrectas.");
    return;
  }

  if (result.user.role !== "admin") {
    alert("Este usuario no es administrador.");
    return;
  }

  // Guardar datos admin
  localStorage.setItem("userId", result.user.id);
  localStorage.setItem("username", result.user.username);
  localStorage.setItem("email", result.user.email);
  localStorage.setItem("role", result.user.role);

  window.location.href = "./main/mainApp.html";

});

// MOSTRAR POPUP TRABAJADOR
document.getElementById("workerAccess").addEventListener("click", () => {
  document.getElementById("popupWorker").style.display = "flex";
});

// CERRAR POPUP TRABAJADOR
document.getElementById("cancelWorker").onclick = () => {
  document.getElementById("popupWorker").style.display = "none";
};

// LOGIN TRABAJADOR
document.getElementById("loginWorkerBtn").addEventListener("click", async () => {
  const user = document.getElementById("workerUser").value.trim();
  const pass = document.getElementById("workerPass").value.trim();

  if (!user || !pass) {
    alert("Completa todos los campos.");
    return;
  }

  const result = await window.api.loginUser({ username: user, password: pass });

  if (!result.success) {
    alert("Credenciales incorrectas.");
    return;
  }

  if (result.user.role !== "trabajador") {
    alert("Este usuario no tiene acceso de trabajador.");
    return;
  }

  // Guardar datos de sesión
  localStorage.setItem("userId", result.user.id);
  localStorage.setItem("username", result.user.username);
  localStorage.setItem("email", result.user.email);
  localStorage.setItem("role", result.user.role);

  window.location.href = "./main/mainApp.html";
});

document.getElementById("adminAccess").addEventListener("click", () => {
  document.getElementById("popupWorker").style.display = "none"; // Cerrar otro
  document.getElementById("popupAdmin").style.display = "flex";
});

document.getElementById("workerAccess").addEventListener("click", () => {
  document.getElementById("popupAdmin").style.display = "none"; // Cerrar otro
  document.getElementById("popupWorker").style.display = "flex";
});




// Mostrar / ocultar contraseña
document.getElementById("togglePassword").addEventListener("click", () => {
  const hidden = passwordInput.type === "password";
  passwordInput.type = hidden ? "text" : "password";
  togglePassword.textContent = hidden ? "🙈" : "👁️";
});
