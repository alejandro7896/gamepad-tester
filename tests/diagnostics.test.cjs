const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../js/diagnostics-core.js");

function makePad({ mapping = "standard", axes = [0, 0, 0, 0], count = 17 } = {}) {
  return {
    index: 0, id: "Control de prueba", connected: true, mapping,
    axes: axes.slice(),
    buttons: Array.from({length: count}, () => ({pressed: false, value: 0}))
  };
}

test("mapeo estándar exige cuatro ejes y al menos 16 botones", () => {
  assert.equal(core.supportsStandardMapping(makePad()), true);
  assert.equal(core.supportsStandardMapping(makePad({mapping: ""})), false);
  assert.equal(core.supportsStandardMapping(makePad({axes: [0,0]})), false);
  assert.equal(core.supportsStandardMapping(makePad({count: 8})), false);
  assert.equal(core.axisPair(makePad({axes: [0,0]}), "right"), null);
});

test("medición de centro acumula muestras y calcula desviación", () => {
  const pad = makePad();
  const state = core.createState(pad);
  core.startCenter(state, "left", 0);
  pad.axes[0] = 0.04;
  pad.axes[1] = -0.03;
  for (const t of [0, 1000, 2000]) core.update(state, pad, t);
  assert.equal(state.sticks.left.center.samples, 3);
  assert.ok(Math.abs(state.sticks.left.center.offset - 0.05) < 1e-8);
  assert.equal(state.sticks.left.center.jitter, 0);
  assert.equal(state.tasks.left, undefined);
});

test("medición de retorno espera recorrido, después reposo sostenido", () => {
  const pad = makePad();
  const state = core.createState(pad);
  core.startReturn(state, "right", 0);
  pad.axes[2] = 0.8;
  core.update(state, pad, 100);
  assert.equal(state.tasks.right.phase, "release");
  pad.axes[2] = 0.1;
  core.update(state, pad, 400);
  core.update(state, pad, 1000);
  assert.equal(state.sticks.right.returnResult.reachedCenter, true);
  assert.ok(state.sticks.right.returnResult.offset < 0.2);
});

test("retorno no observado agota el tiempo sin falso diagnóstico", () => {
  const pad = makePad();
  const state = core.createState(pad);
  core.startReturn(state, "left", 0);
  pad.axes[0] = 0.9;
  core.update(state, pad, 100);
  core.update(state, pad, 15100);
  assert.equal(state.sticks.left.returnResult.reachedCenter, false);
});

test("recorrido guarda máximos independientes por dirección", () => {
  const pad = makePad();
  const state = core.createState(pad);
  core.startTravel(state, "left", 0);
  pad.axes[0] = 0.95;
  pad.axes[1] = -0.98;
  core.update(state, pad, 200);
  pad.axes[0] = -0.91;
  pad.axes[1] = 0.93;
  core.update(state, pad, 500);
  assert.deepEqual(core.stopTravel(state, "left"),
    {left: 0.91, right: 0.95, up: 0.98, down: 0.93});
});

test("gatillos registran máximos y mínimos", () => {
  const pad = makePad();
  const state = core.createState(pad);
  core.startTriggers(state);
  pad.buttons[6].value = 0.98;
  pad.buttons[7].value = 0.96;
  core.update(state, pad, 100);
  core.stopTriggers(state);
  assert.deepEqual(state.triggers.peaks, [0.98, 0.96]);
  assert.deepEqual(state.triggers.minima, [0.98, 0.96]);
  assert.equal(state.triggers.active, false);
});

test("la prueba de botones cuenta cada botón activado", () => {
  const pad = makePad();
  const state = core.createState(pad);
  core.startButtons(state, pad);
  pad.buttons.forEach(b => { b.pressed = true; });
  core.update(state, pad, 100);
  assert.equal(state.buttons.detected.filter(Boolean).length, 17);
  assert.equal(state.buttons.active, false);
});

test("HTML mantiene scripts válidos y rutas relativas", () => {
  for (const filename of ["index.html", "osc.html", "cotizador.html"]) {
    const html = fs.readFileSync(path.join(__dirname, "..", filename), "utf8");
    const scriptBlocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    scriptBlocks.forEach((block, i) =>
      assert.doesNotThrow(() => new vm.Script(block[1], {filename: filename + "#inline-" + i})));
  }
  const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(index, /id="diagnostics-panel"/);
  assert.match(index, /js\/diagnostics-core\.js/);
  assert.match(index, /js\/diagnostics-ui\.js/);
  assert.doesNotMatch(index, /id="decimal-switch"/);
  assert.doesNotMatch(index, /id="test-vibG?"/);
  assert.match(index, /src="osc\.html"/);
  assert.ok(index.indexOf('id="diagnostics-panel"') > index.indexOf('id="oscilloscope"'),
    "El diagnóstico debe quedar debajo del tester/osciloscopio");
  assert.match(index, /data-stick-point="left"/);
  assert.match(index, /data-stick-point="right"/);
  assert.match(index, /r="13\.65"/); // 15% de los 91 px del círculo SVG
  assert.match(index, /utm_campaign=noviembre_2026/);
  assert.doesNotMatch(index, /AGOSTO26/);
  const ui = fs.readFileSync(path.join(__dirname, "..", "js", "diagnostics-ui.js"), "utf8");
  assert.doesNotThrow(() => new vm.Script(ui, {filename: "diagnostics-ui.js"}));
  assert.match(ui, /const CENTER_LIMIT = 0\.15/);
  assert.match(ui, /classList\.toggle\("diag-outside", outside\)/);
});

test("el retorno sólo completa dentro del 15% central", () => {
  const pad = makePad();
  const state = core.createState(pad);
  core.startReturn(state, "left", 0);
  pad.axes[0] = 0.85;
  core.update(state, pad, 100);
  pad.axes[0] = 0.20; // Fuera de la zona central del 15%
  core.update(state, pad, 400);
  core.update(state, pad, 1000);
  assert.equal(state.sticks.left.returnResult, null);
  pad.axes[0] = 0.10;
  core.update(state, pad, 1200);
  core.update(state, pad, 1800);
  assert.equal(state.sticks.left.returnResult.reachedCenter, true);
});
