/* Interfaz de pruebas guiadas. No transmite las lecturas del control a servidores. */
(function () {
  "use strict";
  function init() {
    const core = window.GamepadDiagnosticCore;
    const panel = document.getElementById("diagnostics-panel");
    if (!core || !panel) return;

    const selector = document.getElementById("diagnostic-gamepad");
    const support = document.getElementById("diagnostic-support");
    const sessions = new Map();
    let lastRender = 0, optionsKey = "";

    const percent = n => (100 * n).toFixed(1) + "%";
    const format = n => Number.isFinite(n) ? n.toFixed(3) : "N/D";
    const gamepads = () => typeof navigator.getGamepads === "function"
      ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const activePad = () => typeof window.getActiveGamepad === "function"
      ? window.getActiveGamepad() : gamepads()[0] || null;

    function sessionFor(pad) {
      const existing = sessions.get(pad.index);
      if (!existing || existing.deviceId !== pad.id) {
        const state = core.createState(pad);
        sessions.set(pad.index, state);
        return state;
      }
      return existing;
    }
    function syncDevices() {
      const pads = gamepads();
      const key = pads.map(p => p.index + ":" + p.id).join("|");
      if (key !== optionsKey) {
        optionsKey = key;
        selector.replaceChildren();
        if (!pads.length) {
          const opt = document.createElement("option");
          opt.textContent = "Sin controles conectados";
          opt.value = "";
          selector.appendChild(opt);
        } else {
          pads.forEach(pad => {
            const opt = document.createElement("option");
            opt.value = String(pad.index);
            opt.textContent = "[" + pad.index + "] " + pad.id;
            selector.appendChild(opt);
          });
        }
      }
      const pad = activePad();
      selector.value = pad ? String(pad.index) : "";
      selector.disabled = !pad;
      return pad;
    }
    function stickDescription(state, side) {
      const record = state.sticks[side];
      const task = state.tasks[side];
      const lines = [];
      if (task?.type === "center") {
        lines.push("Midiendo reposo (suelta el joystick)... " +
          Math.max(0, Math.ceil((2000 - (performance.now() - task.started)) / 1000)) + " s");
      } else if (record.center) {
        lines.push("Centro X " + format(record.center.x) + ", Y " + format(record.center.y) +
          " · desplazamiento " + percent(record.center.offset) +
          " · ruido " + percent(record.center.jitter) +
          " · máximo observado " + percent(record.center.maxOffset));
        if (record.center.maxOffset > 0.5) {
          lines.push("Hubo movimientos grandes durante el reposo; repite la prueba sin tocar el stick.");
        }
      } else {
        lines.push("Centro: sin medir. Suelta el joystick durante la prueba de 2 segundos.");
      }
      if (task?.type === "return") {
        lines.push(task.phase === "move"
          ? "Retorno: mueve el joystick hasta aproximadamente el 70% del recorrido."
          : "Retorno: suéltalo y espera 0,5 segundos en la zona central.");
      } else if (record.returnResult) {
        lines.push(record.returnResult.reachedCenter
          ? "Retorno: zona central alcanzada; desplazamiento final " +
            percent(record.returnResult.offset) + "."
          : "Retorno: no se observó un regreso sostenido a la zona central (30%) en 15 s.");
      } else {
        lines.push("Retorno: sin medir.");
      }
      if (task?.type === "travel") {
        lines.push("Recorrido: mueve el joystick en todas las direcciones; pulsa Finalizar.");
      } else if (record.travelResult) {
        const p = record.travelResult;
        lines.push("Recorrido máximo — izquierda " + percent(p.left) +
          " · derecha " + percent(p.right) + " · arriba " + percent(p.up) +
          " · abajo " + percent(p.down));
      } else {
        lines.push("Recorrido: sin medir.");
      }
      return lines.join("\n");
    }
    function render(pad, state) {
      const standard = core.supportsStandardMapping(pad);
      support.textContent = standard
        ? "Mapeo estándar detectado. Las pruebas describen lecturas de la Gamepad API, no certifican el estado físico."
        : "Sin mapeo estándar completo: puedes ver botones y ejes en bruto, pero las pruebas guiadas de sticks y gatillos requieren al menos 4 ejes y 16 botones con mapping=standard.";
      panel.querySelectorAll("[data-diagnostic-action]").forEach(button => {
        const action = button.dataset.diagnosticAction;
        const side = button.dataset.side;
        const task = state.tasks[side];
        button.disabled = !standard && action !== "buttons";
        if (action === "travel") {
          button.textContent = task?.type === "travel" ? "Finalizar recorrido" : "Medir recorrido";
        } else if (action === "triggers") {
          button.textContent = state.triggers?.active ? "Finalizar gatillos" : "Medir gatillos";
          button.disabled = !standard;
        } else if (action === "buttons") {
          button.textContent = state.buttons?.active ? "Reiniciar botones" : "Probar todos los botones";
        }
      });
      for (const side of ["left", "right"]) {
        panel.querySelector('[data-stick-result="' + side + '"]').textContent =
          standard ? stickDescription(state, side) : "No disponible para este mapeo.";
      }
      const trigger = state.triggers;
      panel.querySelector("#diagnostic-triggers-result").textContent = trigger
        ? "Máximo LT/L2: " + percent(trigger.peaks[0]) + " · RT/R2: " +
          percent(trigger.peaks[1]) + " · mínimo observado LT/RT: " +
          percent(trigger.minima[0]) + " / " + percent(trigger.minima[1]) +
          (trigger.active ? "\nPresiona ambos gatillos de 0 a 100% y finaliza." : "\nMedición finalizada.")
        : "Sin medir. Presiona ambos gatillos hasta el fondo durante la prueba.";
      const buttons = state.buttons;
      const total = pad.buttons.length;
      const marked = buttons ? buttons.detected.filter(Boolean).length : 0;
      const missing = buttons ? buttons.detected
        .map((done, i) => done ? null : core.buttonLabel(pad, i)).filter(Boolean) : [];
      panel.querySelector("#diagnostic-buttons-result").textContent = buttons
        ? marked + "/" + total + " botones observados. " +
          (marked === total ? "Todos se activaron." : "Pendientes: " + missing.join(", "))
        : "Sin medir. El test registra cada botón que se active al menos una vez.";
    }
    selector.addEventListener("change", () => {
      if (typeof window.setActiveGamepadIndex === "function") {
        window.setActiveGamepadIndex(Number(selector.value));
      }
    });
    panel.addEventListener("click", e => {
      const button = e.target.closest("[data-diagnostic-action]");
      if (!button) return;
      const pad = activePad();
      if (!pad) return;
      const state = sessionFor(pad);
      const side = button.dataset.side;
      const action = button.dataset.diagnosticAction;
      const now = performance.now();
      if (action === "buttons") core.startButtons(state, pad);
      if (action === "triggers") {
        if (state.triggers?.active) core.stopTriggers(state);
        else core.startTriggers(state);
      }
      if (core.supportsStandardMapping(pad)) {
        if (action === "center") core.startCenter(state, side, now);
        if (action === "return") core.startReturn(state, side, now);
        if (action === "travel") {
          if (state.tasks[side]?.type === "travel") core.stopTravel(state, side);
          else core.startTravel(state, side, now);
        }
      }
      render(pad, state);
    });

    function tick(now) {
      requestAnimationFrame(tick);
      if (document.hidden || now - lastRender < 70) return;
      lastRender = now;
      const pad = syncDevices();
      const hasPad = Boolean(pad);
      panel.querySelector("#diagnostic-empty").hidden = hasPad;
      panel.querySelector("#diagnostic-tests").hidden = !hasPad;
      if (!pad) return;
      const state = sessionFor(pad);
      core.update(state, pad, now);
      render(pad, state);
    }
    requestAnimationFrame(tick);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
