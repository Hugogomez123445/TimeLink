import { state } from "../state.js";

export function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function getInicial(nombre) {
  return nombre ? nombre.charAt(0).toUpperCase() : "?";
}

export function getAvatarHTML(imagen, nombre, tipo = "card") {
  const inicial = getInicial(nombre);

  if (tipo === "popup") {
    return imagen
      ? `<img class="trabajador-avatar-popup" src="${imagen}">`
      : `<div class="trabajador-avatar-popup-inicial">${inicial}</div>`;
  }

  return imagen
    ? `<img class="trabajador-avatar" src="${imagen}">`
    : `<div class="trabajador-avatar-inicial">${inicial}</div>`;
}

export function loadSidebarAvatar() {
  const cont = document.getElementById("sidebarAvatar");
  if (!cont) return;

  const imagen = state.imagen || null;
  const inicial = (state.username?.charAt(0) || "?").toUpperCase();

  if (imagen) cont.innerHTML = `<img src="${imagen}" />`;
  else cont.textContent = inicial;
}

export function assetUrl(fileName) {
  return new URL(`../../../assets/${fileName}`, import.meta.url).href;
}
