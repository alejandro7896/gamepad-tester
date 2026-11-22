/*
 * Panel visual de diagnóstico de El Taller de Alex.
 * Lee exclusivamente Gamepad API, sin transmitir mediciones a servidores.
 */
(function () {
  "use strict";
  function init() {
    const core = window.GamepadDiagnosticCore;
    const panel = document.getElementById("diagnostics-panel");
    if (!core || !panel) return;

    const CENTER_LIMIT = 0.15;
    const selector = panel.querySelector("#diagnostic-gamepad");
    const support = panel.querySelector("#diagnostic-support");
    const empty = panel.querySelector("#diagnostic-empty");
    const tests = panel.querySelector("#diagnostic-tests");
    const buttonsGrid = panel.querySelector("#diagnostic-buttons-grid");
    const sessions = new Map();
    let lastRender = 0;
    let optionsKey = "";
    let lastButtonsKey = "";

    const percent = value => (Math.max(0, Number(value) || 0) * 100).toFixed(1) + "%";
    const format = value => Number.isFinite(value) ? value.toFixed(3) : "—";
    const gamepads = () => typeof navigator.getGamepads === "function"
      ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const activePad = () => typeof window.getActiveGamepad === "function"
      ? window.getActiveGamepad() : gamepads()[0] || null;
    const find = selector => panel.querySelector(selector);
    function sessionFor(pad) {
      const old = sessions.get(pad.index);
      if (!old || old.deviceId !== pad.id) {
        const state = core.createState(pad);
        sessions.set(pad.index, state);
        return state;
      }
      return old;
    }
    function syncDevices() {
      const pads = gamepads();
      const key = pads.map(p => p.index + ":" + p.id).join("|");
      if (key !== optionsKey) {
        optionsKey = key;
        selector.replaceChildren();
        if (!pads.length) {
          const opt = document.createElement("option");
          opt.value = "";
          opt.textContent = "Sin controles";
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
    function updateStick(side, pad, state, standard, now) {
      const card = find('[data-stick-side="' + side + '"]');
      const point = core.axisPair(pad, side);
      const x = point && standard ? point.x : 0;
      const y = point && standard ? point.y : 0;
      const magnitude = Math.hypot(x, y);
      // Verde al centro y también al completar el recorrido (>=99.5% para tolerar redondeos).
      // La alarma roja sólo se aplica a lecturas intermedias; no diagnostica drift.
      const zone = point && standard ? core.stickZone(magnitude, CENTER_LIMIT) : "unknown";
      const fullTravel = zone === "full";
      const outside = zone === "outside";
      card.classList.toggle("diag-outside", outside);
      // El stick llega al borde del SVG sin salir del diagrama cuando X/Y son diagonales.
      const visualScale = magnitude > 1 ? 1 / magnitude : 1;
      const px = 110 + x * 91 * visualScale;
      const py = 110 + y * 91 * visualScale;
      find('[data-stick-point="' + side + '"]').setAttribute("cx", px.toFixed(2));
      find('[data-stick-point="' + side + '"]').setAttribute("cy", py.toFixed(2));
      find('[data-stick-vector="' + side + '"]').setAttribute("x2", px.toFixed(2));
      find('[data-stick-vector="' + side + '"]').setAttribute("y2", py.toFixed(2));
      find('[data-stick-offset="' + side + '"]').textContent =
        standard && point ? percent(magnitude) : "—";
      const status = find('[data-stick-status="' + side + '"]');
      status.textContent = !standard ? "Mapeo no compatible" :
        fullTravel ? "Recorrido completo" :
        outside ? "Fuera del 15%" : "Dentro del 15%";
      find('[data-stick-x="' + side + '"]').textContent = standard ? format(x) : "—";
      find('[data-stick-y="' + side + '"]').textContent = standard ? format(y) : "—";

      const record = state.sticks[side];
      const task = state.tasks[side];
      find('[data-stick-center="' + side + '"]').textContent =
        record.center ? percent(record.center.offset) : "—";
      find('[data-stick-noise="' + side + '"]').textContent =
        record.center ? percent(record.center.jitter) : "—";
      const ret = find('[data-stick-return="' + side + '"]');
      ret.textContent = !record.returnResult ? "—" :
        record.returnResult.reachedCenter
          ? percent(record.returnResult.offset) : "Sin retorno";
      const hint = find('[data-stick-hint="' + side + '"]');
      if (!standard) {
        hint.textContent = "Las mediciones requieren un control con mapeo estándar.";
      } else if (task?.type === "center") {
        const remaining = Math.max(0, Math.ceil((2000 - (now - task.started)) / 1000));
        hint.textContent = "Midiendo centro, no toques el joystick · " + remaining + " s";
      } else if (task?.type === "return") {
        hint.textContent = task.phase === "move"
          ? "Llévalo al 70% del recorrido para iniciar."
          : "Suéltalo y déjalo volver al centro.";
      } else if (task?.type === "travel") {
        hint.textContent = "Gira el joystick en todas direcciones y pulsa Finalizar.";
      } else if (record.center && record.center.maxOffset > 0.5) {
        hint.textContent = "Detectamos movimiento durante la prueba de reposo. Repítela.";
      } else if (record.returnResult && !record.returnResult.reachedCenter) {
        hint.textContent = "No observamos el retorno en 15 s; repite la prueba.";
      } else {
        hint.textContent = "Zona verde = referencia visual. Medir centro = prueba de drift en reposo.";
      }

      const travelPanel = find('[data-stick-travel="' + side + '"]');
      const travel = record.travelResult;
      if (!travel) {
        travelPanel.hidden = true;
      } else {
        travelPanel.hidden = false;
        const directions = [["Izquierda", "left"], ["Derecha", "right"],
          ["Arriba", "up"], ["Abajo", "down"]];
        for (const [label, key] of directions) {
          let row = travelPanel.querySelector('[data-direction="' + key + '"]');
          if (!row) {
            row = document.createElement("div");
            row.className = "diag-travel-row";
            row.dataset.direction = key;
            const name = document.createElement("span");
            name.textContent = label;
            const bar = document.createElement("div");
            bar.className = "diag-progress";
            bar.appendChild(document.createElement("span"));
            const value = document.createElement("b");
            row.append(name, bar, value);
            travelPanel.appendChild(row);
          }
          row.querySelector(".diag-progress > span").style.width =
            Math.min(100, Math.max(0, travel[key] * 100)) + "%";
          row.querySelector("b").textContent = percent(travel[key]);
        }
      }
    }
    function updateTriggers(pad, state, standard) {
      const trigger = state.triggers;
      [0, 1].forEach((position) => {
        const instant = standard ? Math.max(0, Math.min(1, Number(pad.buttons[6 + position]?.value) || 0)) : 0;
        const max = trigger ? trigger.peaks[position] : instant;
        find('[data-trigger-fill="' + position + '"]').style.width = instant * 100 + "%";
        find('[data-trigger-max="' + position + '"]').textContent = standard ? percent(max) : "—";
      });
      find("#diagnostic-triggers-result").textContent = !standard
        ? "Los gatillos requieren mapeo estándar."
        : !trigger ? "Presiona iniciar para registrar el máximo."
        : trigger.active ? "Midiendo recorrido… pulsa Finalizar para guardar."
        : "Medición finalizada · LT " + percent(trigger.peaks[0]) +
          " / RT " + percent(trigger.peaks[1]);
    }
    function updateButtons(pad, state) {
      const data = state.buttons;
      const key = pad.index + ":" + pad.id + ":" + pad.buttons.length;
      if (key !== lastButtonsKey) {
        lastButtonsKey = key;
        buttonsGrid.replaceChildren();
        pad.buttons.forEach((_, i) => {
          const chip = document.createElement("span");
          chip.className = "diag-button-chip";
          chip.dataset.buttonIndex = String(i);
          chip.textContent = core.buttonLabel(pad, i);
          buttonsGrid.appendChild(chip);
        });
      }
      const count = data ? data.detected.filter(Boolean).length : 0;
      const total = pad.buttons.length;
      find("[data-buttons-count]").textContent = count + "/" + total;
      find("[data-button-progress]").style.width = (total ? count / total * 100 : 0) + "%";
      buttonsGrid.querySelectorAll("[data-button-index]").forEach(chip => {
        const i = Number(chip.dataset.buttonIndex);
        chip.classList.toggle("diag-detected", !!data?.detected[i]);
      });
      find("#diagnostic-buttons-result").textContent = !data
        ? "Presiona iniciar para comprobar todos los botones."
        : count === total ? "Todos los botones expuestos respondieron."
        : "Los botones verdes ya fueron detectados.";
    }
    function render(pad, state, now) {
      const standard = core.supportsStandardMapping(pad);
      panel.querySelectorAll("[data-diagnostic-action]").forEach(button => {
        const action = button.dataset.diagnosticAction;
        const side = button.dataset.side;
        const task = state.tasks[side];
        button.disabled = !standard && action !== "buttons";
        if (action === "travel") {
          button.textContent = task?.type === "travel" ? "Finalizar recorrido" : "Recorrido";
        } else if (action === "triggers") {
          button.textContent = state.triggers?.active ? "Finalizar prueba" : "Iniciar prueba";
        } else if (action === "buttons") {
          button.textContent = state.buttons?.active ? "Reiniciar prueba" : "Iniciar prueba";
        }
      });
      for (const side of ["left", "right"]) updateStick(side, pad, state, standard, now);
      updateTriggers(pad, state, standard);
      updateButtons(pad, state);
      support.textContent = standard
        ? "Mapeo estándar detectado. Datos obtenidos del navegador."
        : "Mapeo no estándar: visualización de ejes y prueba de gatillos no disponibles; botones genéricos disponibles.";
    }
    selector.addEventListener("change", () => {
      if (selector.value !== "" && typeof window.setActiveGamepadIndex === "function") {
        window.setActiveGamepadIndex(Number(selector.value));
      }
    });
    panel.addEventListener("click", event => {
      const button = event.target.closest("[data-diagnostic-action]");
      if (!button) return;
      const pad = activePad();
      if (!pad) return;
      const state = sessionFor(pad);
      const side = button.dataset.side;
      const action = button.dataset.diagnosticAction;
      const now = performance.now();
      if (action === "buttons") core.startButtons(state, pad);
      if (action === "triggers" && core.supportsStandardMapping(pad)) {
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
      render(pad, state, now);
    });
    function tick(now) {
      requestAnimationFrame(tick);
      if (document.hidden || now - lastRender < 50) return;
      lastRender = now;
      const pad = syncDevices();
      empty.hidden = !!pad;
      tests.hidden = !pad;
      if (!pad) return;
      const state = sessionFor(pad);
      core.update(state, pad, now);
      render(pad, state, now);
    }
    requestAnimationFrame(tick);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
