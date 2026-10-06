const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function harness() {
    function emitter() {
        const listeners = new Map();
        return {
            listeners,
            addEventListener(type, fn) {
                if (!listeners.has(type)) listeners.set(type, new Set());
                listeners.get(type).add(fn);
            },
            removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
            emit(type, event) { for (const fn of listeners.get(type) || []) fn(event); },
            count() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
        };
    }
    const stage = Object.assign(emitter(), {enableMouseOver() {}});
    const view = Object.assign(emitter(), {
        stage,
        getInputX(x, y) { return this.stage ? (x - 20) / 2 : null; },
    });
    class ContainerX { system = {stage}; }
    const calls = [];
    const model = {
        move(x) { calls.push(['move', x]); },
        drop() { calls.push(['drop']); },
        update() { calls.push(['update']); },
    };
    const module = {exports: {}};
    const output = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/scene/play/Controller.ts'), 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true},
    }).outputText;
    const context = vm.createContext({createjs: {Touch: {enable() {}}}});
    vm.runInContext('(function(require,module,exports){' + output + '\n})', context)(
        () => ContainerX, module, module.exports,
    );
    const Controller = module.exports.default;
    return {stage, view, calls, Controller, model};
}
test('input uses converted coordinates and invokes the model without View command methods', () => {
    const h = harness();
    const controller = new h.Controller(h.view, h.model);
    h.stage.emit('stagemousemove', {stageX: 220, stageY: 50});
    h.stage.emit('stagemouseup', {stageX: 220, stageY: 50});
    h.view.emit('tick');
    assert.deepEqual(h.calls, [['move', 100], ['drop'], ['update']]);
    h.view.stage = null;
    h.stage.emit('stagemousemove', {stageX: 400, stageY: 50});
    h.stage.emit('stagemouseup');
    assert.equal(h.calls.length, 3);
    controller.dispose();
});
test('repeated controller disposal removes input and tick listeners without stale callbacks', () => {
    const h = harness();
    for (let i = 0; i < 20; i++) {
        const controller = new h.Controller(h.view, h.model);
        assert.equal(h.stage.count(), 2);
        assert.equal(h.view.count(), 1);
        const move = [...h.stage.listeners.get('stagemousemove')][0];
        const drop = [...h.stage.listeners.get('stagemouseup')][0];
        const tick = [...h.view.listeners.get('tick')][0];
        h.view.emit('tick');
        const before = h.calls.length;
        controller.dispose();
        controller.dispose();
        assert.equal(h.stage.count(), 0);
        assert.equal(h.view.count(), 0);
        move({stageX: 100, stageY: 0});
        drop();
        tick();
        h.view.emit('tick');
        h.stage.emit('stagemouseup');
        assert.equal(h.calls.length, before);
    }
});
