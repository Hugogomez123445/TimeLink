import { state } from "../state.js";
import { api } from "../api.js";
import { notify } from "./notify.js";

const LS_KEY = "worker_notified_citas_ids";

function loadSet() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    return new Set(arr.map(String));
  } catch {
    return new Set();
  }
}

function saveSet(set) {
  localStorage.setItem(LS_KEY, JSON.stringify([...set].slice(-300)));
}

export function startWorkerNewCitaNotifier() {
  const role = String(state.role || "").toLowerCase();
  const esTrabajador = role === "trabajador" || role === "trabajadores";
  if (!esTrabajador) return;

  const trabajadorId = state.userId;
  if (!trabajadorId) return;

  let seen = loadSet();
  let firstRun = true;

  const tick = async () => {
    try {
      const citas = await api.getCitasTrabajador({ trabajador_id: trabajadorId });

      // Primer run: marcar todas como vistas
      if (firstRun) {
        (citas || []).forEach(c => c?.id != null && seen.add(String(c.id)));
        saveSet(seen);
        firstRun = false;
        return;
      }

      const nuevas = (citas || []).filter(c => {
        const id = String(c.id ?? "");
        if (!id) return false;
        const estado = String(c.estado || "reservado").toLowerCase();
        return estado === "reservado" && !seen.has(id);
      });

      for (const c of nuevas) {
        await notify("📌 Nueva cita", `${c.fecha} ${c.hora} · Cliente: ${c.cliente || "—"}`);
        seen.add(String(c.id));
      }

      if (nuevas.length) saveSet(seen);
    } catch (e) {
      console.error("worker notifier error:", e);
    }
  };

  tick();
  setInterval(tick, 15000); // 15s
}
