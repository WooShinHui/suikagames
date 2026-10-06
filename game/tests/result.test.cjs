const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const turn = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
};
const top = [{rank: 1, username: 'Top', total_score: 100, userId: 'top'}];
const me = {rank: 25, username: 'QA', total_score: 30, userId: 'qa'};

function harness(source, dom = false) {
    const timers = new Map();
    let timerId = 0;
    const window = dom ? new JSDOM('<div><canvas></canvas></div>').window : undefined;
    const context = vm.createContext({
        console: { log() {}, error() {} },
        window, document: window?.document,
        setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame(fn) { fn(); return 0; },
        createjs: {EventDispatcher: {initialize(target) {
            target.addEventListener = () => {};
            target.removeEventListener = () => {};
            target.dispatchEvent = () => {};
        }}},
    });
    const cache = new Map();
    function load(file) {
        file = path.resolve(file);
        if (cache.has(file)) return cache.get(file).exports;
        const module = {exports: {}};
        cache.set(file, module);
        const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
            compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
        }).outputText;
        vm.runInContext('(function(require,module,exports){' + output + '\n})', context, {filename: file})(
            (spec) => load(path.resolve(path.dirname(file), spec + '.ts')), module, module.exports
        );
        return module.exports;
    }
    const root = path.resolve(__dirname, '../src');
    const {ResultModel} = load(path.join(root, 'scene/play/Model/ResultModel.ts'));
    const {ResultController} = load(path.join(root, 'scene/play/Controller/ResultController.ts'));
    const {EVT_HUB_SAFE: hub} = load(path.join(root, 'events/SafeEventHub.ts'));
    const {G_EVT: events} = load(path.join(root, 'events/EVT_HUB.ts'));
    const calls = [];
    let actions;
    let view;
    if (dom) {
        const {ResultView} = load(path.join(root, 'scene/play/View/conditional/result/ResultView.ts'));
        view = new ResultView();
    } else {
        view = {
            setActions(value) { actions = value; },
            showLoading() { calls.push(['loading']); },
            render(snapshot, rankings) { calls.push(['render', snapshot, rankings]); },
            updatePagination() {},
            showError() { calls.push(['error']); },
            hide(immediate) { calls.push(['hide', immediate]); },
            renderRankings(rankings, title) { calls.push(['ranking', rankings, title]); },
            showNearbyLoading() {}, showNearbyError() {}, appendRankings() {},
        };
    }
    const model = new ResultModel(source);
    const controller = new ResultController(model, view);
    return {model, controller, view, hub, events, calls, window, timers, get actions() {return actions;}};
}

function source(overrides = {}) {
    return {
        getRankingData: async () => ({topRankings: top, myRanking: me}),
        getNearbyBestRankings: async () => [me],
        getTopBestScores: async () => ({rankings: [], lastDoc: null}),
        ...overrides,
    };
}

test('session, score save and leaderboard mode preserve their event payloads', async () => {
    const h = harness(source());
    let saved;
    h.hub.on(h.events.PLAY.REQUEST_COLLISION_SAVE, (event) => {saved = event.data;});
    h.hub.emit(h.events.PLAY.SESSION_STARTED, {userId: 'qa', username: 'QA'});
    h.hub.emit(h.events.DATA.SCORE_UPDATED, {totalScore: 10});
    h.hub.emit(h.events.PLAY.GAME_OVER, {finalScore: 30});
    assert.deepEqual(JSON.parse(JSON.stringify(saved)), {finalScore: 30, userId: 'qa', username: 'QA', gameSessionId: null});
    h.hub.emit(h.events.PLAY.SHOW_RESULT, {mode: 'GAME_OVER', finalScore: 30, previousHighScore: 30, isNewRecord: true});
    await turn();
    assert.equal(h.calls.find((call) => call[0] === 'render')[1].isNewRecord, true);
    h.hub.emit(h.events.PLAY.SHOW_RESULT, {mode: 'START', finalScore: 999, isNewRecord: true});
    await turn();
    const snapshot = h.calls.filter((call) => call[0] === 'render').at(-1)[1];
    assert.equal(snapshot.finalScore, 30);
    assert.equal(snapshot.isNewRecord, false);
    assert.equal(h.model.pagination.hasMore, false);
    h.controller.dispose();
});

test('a nearby reply cannot replace the top tab selected while it was pending', async () => {
    const pending = deferred();
    const h = harness(source({getNearbyBestRankings: () => pending.promise}));
    h.hub.emit(h.events.PLAY.SHOW_RESULT, {mode: 'START'});
    await turn();
    h.actions.nearby();
    h.actions.top();
    pending.resolve([me]);
    await turn();
    const rendered = h.calls.filter((call) => call[0] === 'ranking');
    assert.equal(rendered.length, 1);
    assert.equal(rendered[0][2], '🏆 Global Top');
    h.controller.dispose();
});

test('dispose ignores pending results and removes subscriptions over repeated lifetimes', async () => {
    const pending = deferred();
    const h = harness(source({getRankingData: () => pending.promise}));
    h.hub.emit(h.events.PLAY.SHOW_RESULT, {mode: 'START'});
    h.controller.dispose();
    pending.resolve({topRankings: top, myRanking: me});
    await turn();
    assert.equal(h.calls.some((call) => call[0] === 'render'), false);
    let saves = 0;
    h.hub.on(h.events.PLAY.REQUEST_COLLISION_SAVE, () => {saves++;});
    h.hub.emit(h.events.PLAY.GAME_OVER, {finalScore: 30});
    assert.equal(saves, 0);
    for (let i = 0; i < 20; i++) {
        const fresh = harness(source());
        fresh.controller.dispose();
        fresh.controller.dispose();
        fresh.hub.on(fresh.events.PLAY.REQUEST_COLLISION_SAVE, () => {saves++;});
        fresh.hub.emit(fresh.events.PLAY.GAME_OVER, {finalScore: 30});
    }
    assert.equal(saves, 0);
});

test('result views preserve game-over controls, leaderboard tabs and disposal of effects', async () => {
    const h = harness(source(), true);
    h.hub.emit(h.events.PLAY.SESSION_STARTED, {userId: 'qa', username: 'QA'});
    h.hub.emit(h.events.PLAY.SHOW_RESULT, {mode: 'GAME_OVER', finalScore: 30, previousHighScore: 30, isNewRecord: true});
    await turn();
    const doc = h.window.document;
    assert.equal(doc.querySelector('#score-val').textContent.trim(), '30');
    assert.equal(doc.querySelector('#result-close-btn').style.display, 'none');
    assert.notEqual(doc.querySelector('#restart-action-btn').style.display, 'none');
    assert.ok(doc.querySelector('#inner-box').textContent.includes('NEW RECORD!'));
    h.hub.emit(h.events.PLAY.SHOW_RESULT, {mode: 'START'});
    await turn();
    assert.equal(doc.querySelector('#score-val'), null);
    assert.equal(doc.querySelector('#restart-action-btn').style.display, 'none');
    assert.notEqual(doc.querySelector('#result-close-btn').style.display, 'none');
    doc.querySelector('#tab-nearby').click();
    await turn();
    assert.ok(doc.querySelector('#ranking-content').textContent.includes('QA'));
    doc.querySelector('#tab-top').click();
    assert.ok(doc.querySelector('#ranking-content').textContent.includes('Top'));
    doc.querySelector('#result-close-btn').click();
    h.hub.emit(h.events.PLAY.SHOW_RESULT, {mode: 'START'});
    await turn();
    assert.equal(h.timers.size, 0);
    assert.equal(doc.querySelector('#result-container').style.display, 'flex');
    h.controller.dispose();
    h.view.dispose();
    assert.equal(doc.querySelector('#result-container'), null);
    assert.equal(h.timers.size, 0);
    h.window.close();
});
