console.log("renderer cargado");
console.log("window.api =", window.api);

let isLogin = true;

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

// Helper para loader
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

// transicion entre login y registro
toggleText.addEventListener("click", () => {
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

// Accion login / registro
actionBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert("Por favor, completa todos los campos.");
    return;
  }

  if (isLogin) {
    // LOGIN
    try {
      setLoading(true);
      const result = await window.api.loginUser({ username, password });

      if (result.success) {
        localStorage.setItem("username", result.user.username);
        localStorage.setItem("email", result.user.email);
        window.location.href = "mainApp.html";
      } else {
        // ⚠️ SHAKE EN LOGIN FALLIDO
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
  } else {
    // REGISTRO
    const email = emailInput.value.trim();
    if (!email) {
      alert("Introduce tu correo electrónico.");
      return;
    }

    // VALIDACIÓN DE CONTRASEÑA
    let errors = [];

    if (password.length < 8) errors.push("• Mínimo 8 caracteres.");
    if (!/[0-9]/.test(password)) errors.push("• Debe contener al menos un número.");
    if (!/[!@#$%^&*(),.?\":{}|<>_\-]/.test(password)) errors.push("• Debe contener un símbolo especial.");

    if (errors.length > 0) {
      passwordError.innerHTML = errors.join("<br>");
      passwordError.style.display = "block";

      passwordError.style.transform = "translateX(-3px)";
      setTimeout(() => (passwordError.style.transform = "translateX(0)"), 150);

      return;
    }

    try {
      setLoading(true);
      const result = await window.api.registerUser({ username, email, password });

      if (result.success) {
        alert("Usuario registrado correctamente.");
        title.textContent = "Iniciar Sesión";
        btnText.textContent = "Entrar";
        toggleText.textContent = "¿No tienes cuenta? Regístrate";
        emailGroup.style.display = "none";
        strengthContainer.style.display = "none";
        passwordError.style.display = "none";
        isLogin = true;
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error al registrar el usuario.");
    } finally {
      setLoading(false);
    }
  }
});

// Validación en tiempo real + barra de colores de fuerza
passwordInput.addEventListener("input", () => {
  if (isLogin) {
    passwordError.style.display = "none";
    strengthContainer.style.display = "none";
    return;
  }

  const val = passwordInput.value;
  let errors = [];
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

  if (val.length < 8) errors.push("• Mínimo 8 caracteres.");
  if (!/[0-9]/.test(val)) errors.push("• Debe contener al menos un número.");
  if (!/[!@#$%^&*(),.?\":{}|<>_\-]/.test(val)) errors.push("• Debe contener un símbolo especial.");

  if (errors.length > 0) {
    passwordError.innerHTML = errors.join("<br>");
    passwordError.style.display = "block";
  } else {
    passwordError.style.display = "none";
  }

  if (strength <= 1) {
    strengthBar.style.width = "33%";
    strengthBar.style.background = "#ef4444";
  } else if (strength === 2) {
    strengthBar.style.width = "66%";
    strengthBar.style.background = "#f59e0b";
  } else if (strength >= 3) {
    strengthBar.style.width = "100%";
    strengthBar.style.background = "#22c55e";
  }
});

// Mostrar / ocultar contraseña
document.getElementById("togglePassword").addEventListener("click", () => {
  const hidden = passwordInput.type === "password";
  passwordInput.type = hidden ? "text" : "password";
  togglePassword.textContent = hidden ? "🙈" : "👁️";
});
