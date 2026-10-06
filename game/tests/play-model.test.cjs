const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Matter = require('matter-js');

// Load the real model and unchanged event hubs without running Firebase or browser SDKs.
function harness() {
    const cache = new Map();
    const timers = new Map();
    let clock = 10000, nextTimer = 0;
    const context = vm.createContext({
        console: {log(){}, groupCollapsed(){}, groupEnd(){}, trace(){}},
        Date: {now: () => clock},
        Math: Object.assign(Object.create(Math), {random: () => 0}),
        setTimeout(fn) { const id = ++nextTimer; timers.set(id,fn); return id; },
        clearTimeout(id) { timers.delete(id); },
        createjs: {EventDispatcher:{initialize(target) {
            target.addEventListener = () => {};
            target.removeEventListener = () => {};
            target.dispatchEvent = () => {};
        }}},
    });
    function load(file) {
        file = path.resolve(file);
        if(cache.has(file)) return cache.get(file).exports;
        const module = {exports:{}};
        cache.set(file,module);
        const output = ts.transpileModule(fs.readFileSync(file,'utf8'),{
            compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
        }).outputText;
        const requireLocal = spec => spec==='matter-js' ? Matter : load(path.resolve(path.dirname(file),spec+'.ts'));
        vm.runInContext('(function(require,module,exports){'+output+'\n})',context,{filename:file})(requireLocal,module,module.exports);
        return module.exports;
    }
    const root = path.resolve(__dirname,'../src');
    const {PlayModel} = load(path.join(root,'scene/play/Model/PlayModel.ts'));
    const {EVT_HUB_SAFE:hub} = load(path.join(root,'events/SafeEventHub.ts'));
    const {G_EVT:events} = load(path.join(root,'events/EVT_HUB.ts'));
    const engine = Matter.Engine.create();
    let count=0, collisionListener=null, disposed=false;
    const physics={engine,minX:138.8,maxX:761.2,spawnY:560,gameOverY:1020,
        pairs:[], update(){},
        createFruit(type,x,y,merged) {
            const body=Matter.Bodies.circle(x,y,[15,30,46,56,66,80,90,106,116,136,160][type],{label:'Bead_'+count++});
            body.typeX=type;
            if(!merged) Matter.Body.setMass(body,type+1);
            Matter.World.add(engine.world,body);
            return body;
        },
        removeFruit(body){Matter.World.remove(engine.world,body);},
        onCollision(fn){collisionListener=fn;}, offCollision(fn){assert.equal(fn,collisionListener);collisionListener=null;},
        dispose(){disposed=true;Matter.World.clear(engine.world,false);},
    };
    const rendered=new Map();
    const calls=[];
    const presentation={
        addFruit(body){rendered.set(body.label,body);},removeFruit(label){rendered.delete(label);},
        syncFruits(){},setFruitFace(...args){calls.push(['face',...args]);},
        showPreview(...args){calls.push(['preview',...args]);},movePreview(x){calls.push(['move',x]);},
        playMerge(...args){calls.push(['merge',...args]);},playDrop(){},
        updateWarning(active){calls.push(['warning',active]);},showMergeUnavailable(){calls.push(['unavailable']);},
    };
    const model=new PlayModel(physics);
    model.setPresentation(presentation);
    const eventLog=[];
    for(const type of Object.values(events.PLAY).concat(Object.values(events.DATA))) hub.on(type,e=>eventLog.push(JSON.parse(JSON.stringify(e))));
    model.startGame();
    return {model,physics,rendered,calls,hub,events,eventLog,timers,
        advance(ms){clock+=ms;},
        cooldown(){for(const fn of timers.values()) fn();timers.clear();},
        collision(pairs){collisionListener({pairs});},
        isDisposed(){return disposed;},
    };
}

test('drop preview, clamping and one-second cooldown retain their rules',()=>{
    const h=harness();
    assert.deepEqual(h.calls[0],['preview',450,0,0,false]);
    h.model.move(-999);assert.deepEqual(h.calls.at(-1),['move',156.3]);
    h.model.move(9999);assert.deepEqual(h.calls.at(-1),['move',743.7]);
    h.model.drop();h.model.drop();assert.equal(h.rendered.size,1);
    h.cooldown();h.model.drop();assert.equal(h.rendered.size,2);
    for(const body of h.rendered.values()) assert.equal(body.position.y,560);
    h.model.dispose();
});
test('three touching fruits cannot merge or score the same body twice in a tick',()=>{
    const h=harness();
    for(let i=0;i<3;i++){h.model.drop();h.cooldown();}
    const [a,b,c]=h.rendered.values();
    h.physics.pairs=[{bodyA:a,bodyB:b,collision:{supports:[]}},{bodyA:b,bodyB:c,collision:{supports:[]}}];
    h.model.update();
    assert.equal(h.model.score,1);
    assert.equal(h.rendered.size,2);
    assert.equal(h.eventLog.filter(e=>e.type===h.events.DATA.SCORE_UPDATED).length,1);
    assert.deepEqual([...h.rendered.values()].map(b=>b.typeX),[0,1]);
    h.model.dispose();
});
test('random merge preserves score payload and failure notification',()=>{
    const h=harness();
    h.hub.emit(h.events.PLAY.MERGE_REQUEST);
    assert.equal(h.eventLog.filter(e=>e.type===h.events.PLAY.MERGE_FAIL).length,1);
    h.model.drop();h.cooldown();h.model.drop();
    h.hub.emit(h.events.PLAY.MERGE_REQUEST);
    assert.equal(h.model.score,1);
    assert.equal(h.rendered.size,1);
    const scoreEvent=h.eventLog.find(e=>e.type===h.events.DATA.SCORE_UPDATED);
    assert.deepEqual(scoreEvent.data,{totalScore:1,x:450,y:560});
    h.model.dispose();
});
test('falling fruits are excluded, settled fruit above the line ends after four seconds',()=>{
    const h=harness();h.model.drop();
    h.model.update();h.advance(5000);h.model.update();assert.equal(h.model.isActive,true);
    const body=[...h.rendered.values()][0];
    h.collision([{bodyA:body,bodyB:{label:'ground'}}]);
    h.model.update();h.advance(3999);h.model.update();assert.equal(h.model.isActive,true);
    h.advance(1);h.model.update();assert.equal(h.model.isActive,false);
    const over=h.eventLog.filter(e=>e.type===h.events.PLAY.GAME_OVER);
    assert.equal(over.length,1);assert.deepEqual(over[0].data,{finalScore:0,mode:'GAME_OVER'});
    h.model.handleGameOver('TIME_OUT');assert.equal(h.eventLog.filter(e=>e.type===h.events.PLAY.GAME_OVER).length,1);
    h.model.dispose();
});
test('dispose cancels timers and event subscriptions across repeated games',()=>{
    const h=harness();h.model.drop();assert.equal(h.timers.size,1);
    h.model.dispose();h.model.dispose();
    assert.equal(h.timers.size,0);assert.equal(h.isDisposed(),true);
    assert.equal(h.rendered.size,1); // Rendering disposal is owned by View, not Model.
    const before=h.eventLog.length;
    h.hub.emit(h.events.PLAY.MERGE_REQUEST);h.hub.emit(h.events.PLAY.TIME_OUT,'TIME_OUT');
    assert.equal(h.eventLog.length,before+2); // Only the test observer remains.
    for(let i=0;i<20;i++) {const next=harness();next.model.drop();next.model.dispose();assert.equal(next.timers.size,0);}
});
