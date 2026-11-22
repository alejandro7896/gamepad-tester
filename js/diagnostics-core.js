/*
 * Diagnóstico no invasivo con Gamepad API.
 * Los resultados describen lecturas del navegador, NO certifican el hardware.
 * Compatible con navegador y con node:test (CommonJS).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GamepadDiagnosticCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STICKS = { left: [0, 1], right: [2, 3] };
  const STANDARD_BUTTONS = [
    "A / ✕", "B / ○", "X / □", "Y / △", "LB / L1", "RB / R1",
    "LT / L2", "RT / R2", "Vista / Share", "Menú / Options",
    "L3", "R3", "Cruceta ↑", "Cruceta ↓", "Cruceta ←", "Cruceta →",
    "Guía / PS"
  ];

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }
  function magnitude(x, y) {
    return Math.hypot(finite(x), finite(y));
  }
  function axisPair(pad, side) {
    const indices = STICKS[side];
    if (!indices || !pad || !pad.axes ||
        !Number.isFinite(pad.axes[indices[0]]) ||
        !Number.isFinite(pad.axes[indices[1]])) return null;
    return { x: pad.axes[indices[0]], y: pad.axes[indices[1]] };
  }
  function supportsStandardMapping(pad) {
    return !!(pad && pad.mapping === "standard" &&
      pad.axes && pad.axes.length >= 4 &&
      pad.buttons && pad.buttons.length >= 16);
  }
  function buttonLabel(pad, index) {
    return pad && pad.mapping === "standard" && STANDARD_BUTTONS[index]
      ? STANDARD_BUTTONS[index] : "Botón " + index;
  }
  function createState(pad) {
    return {
      deviceId: pad.id,
      sticks: { left: { center: null, returnResult: null, travelResult: null },
                right: { center: null, returnResult: null, travelResult: null } },
      tasks: {},
      buttons: null,
      triggers: null
    };
  }
  function startCenter(state, side, now) {
    state.tasks[side] = { type: "center", started: now, samples: [] };
    state.sticks[side].center = null;
  }
  function centerStats(samples) {
    if (!samples.length) return null;
    const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length;
    const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length;
    const jitter = Math.sqrt(samples.reduce((s, p) =>
      s + Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2), 0) / samples.length);
    return {
      samples: samples.length, x: avgX, y: avgY,
      offset: magnitude(avgX, avgY),
      maxOffset: Math.max(...samples.map(p => magnitude(p.x, p.y))),
      jitter
    };
  }
  function startReturn(state, side, now) {
    state.tasks[side] = { type: "return", started: now, phase: "move",
      settledFrom: 0, samples: [] };
    state.sticks[side].returnResult = null;
  }
  function startTravel(state, side, now) {
    state.tasks[side] = { type: "travel", started: now,
      peaks: { left: 0, right: 0, up: 0, down: 0 } };
    state.sticks[side].travelResult = null;
  }
  function stopTravel(state, side) {
    const task = state.tasks[side];
    if (!task || task.type !== "travel") return null;
    const result = { ...task.peaks };
    state.sticks[side].travelResult = result;
    delete state.tasks[side];
    return result;
  }
  function startButtons(state, pad) {
    state.buttons = { active: true, detected: Array(pad.buttons.length).fill(false) };
  }
  function startTriggers(state) {
    state.triggers = { active: true, peaks: [0, 0], minima: [1, 1] };
  }
  function stopTriggers(state) {
    if (state.triggers) state.triggers.active = false;
  }
  function update(state, pad, now) {
    if (!pad || !pad.connected) return;
    for (const side of Object.keys(STICKS)) {
      const task = state.tasks[side];
      if (!task) continue;
      const point = axisPair(pad, side);
      if (!point) { delete state.tasks[side]; continue; }
      const radius = magnitude(point.x, point.y);
      if (task.type === "center") {
        task.samples.push(point);
        if (now - task.started >= 2000) {
          state.sticks[side].center = centerStats(task.samples);
          delete state.tasks[side];
        }
      } else if (task.type === "travel") {
        task.peaks.left = Math.max(task.peaks.left, -point.x);
        task.peaks.right = Math.max(task.peaks.right, point.x);
        task.peaks.up = Math.max(task.peaks.up, -point.y);
        task.peaks.down = Math.max(task.peaks.down, point.y);
      } else if (task.type === "return") {
        if (task.phase === "move" && radius >= 0.7) task.phase = "release";
        if (task.phase === "release") {
          if (radius <= 0.3) {
            if (!task.settledFrom) task.settledFrom = now;
            task.samples.push(point);
            if (now - task.settledFrom >= 500) {
              const stats = centerStats(task.samples);
              state.sticks[side].returnResult = { ...stats, reachedCenter: true };
              delete state.tasks[side];
            }
          } else {
            task.settledFrom = 0;
            task.samples = [];
          }
        }
        if (state.tasks[side] && now - task.started >= 15000) {
          state.sticks[side].returnResult = { reachedCenter: false };
          delete state.tasks[side];
        }
      }
    }
    if (state.buttons && state.buttons.active) {
      pad.buttons.forEach((b, i) => {
        if (b && (b.pressed || finite(b.value) >= 0.5)) state.buttons.detected[i] = true;
      });
      if (state.buttons.detected.every(Boolean)) state.buttons.active = false;
    }
    if (state.triggers && state.triggers.active && supportsStandardMapping(pad)) {
      [6, 7].forEach((index, position) => {
        const value = finite(pad.buttons[index]?.value);
        state.triggers.peaks[position] = Math.max(state.triggers.peaks[position], value);
        state.triggers.minima[position] = Math.min(state.triggers.minima[position], value);
      });
    }
  }

  return {
    STANDARD_BUTTONS, axisPair, supportsStandardMapping, buttonLabel,
    createState, startCenter, centerStats, startReturn, startTravel, stopTravel,
    startButtons, startTriggers, stopTriggers, update
  };
});
