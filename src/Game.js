import box2DLoader from './Box2D/initBox2d';
import Time from './Time/Time';
import uuid from 'uuid';
import perf, {Measures} from './Stats/perf';
import statsHeap from './Stats/stats-heap';
import Player from './Player';
import Boulder from './Boulder';
import Spawn from './Spawn';
import Wall from './Wall';
import Graphics from './Graphics/Graphics';

let Box2D;

const fps = 30;

const wallSize = 1;
const map = [
    ['x', 'x', 'x', 'x', 's', 'x', 's', 'x', 'x', 'x', 's', 'x', 'x', 's', 'x', 'x',],
    ['s', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'x',],
    ['x', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'x',],
    ['x', ' ', ' ', ' ', 'x', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'x', ' ', 's',],
    ['x', ' ', ' ', ' ', ' ', ' ', ' ', 'x', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'x',],
    ['x', ' ', ' ', 'x', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'x', ' ', ' ', ' ', 's',],
    ['s', ' ', ' ', ' ', ' ', ' ', 'x', ' ', ' ', 'x', ' ', ' ', ' ', ' ', ' ', 'x',],
    ['x', 'x', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'x',],
    ['x', 'x', 's', 'x', 'x', 's', 'x', 'x', 's', 'x', 's', 'x', 'x', 's', 'x', 'x',],
];

export default class Game {
    updateGraphics = () => {
        perf.markEvent(Measures.RenderFrameEvent);
        perf.usingMeasure(Measures.RenderFrameTime, () => {
            this.graphics.update(this.gameObjects);
        });
    };
    updatePhysics = (elapsed) => {
        perf.markEvent(Measures.PhysicsFrameEvent);
        perf.usingMeasure(Measures.PhysicsFrameTime, () => {
            this.totalTime += elapsed;
            this.player.updatePhysics(elapsed);
            this.tryCleanRocks();
            this.trySpawnBoulders();
            this.processCallbacks();
            this.world.Step(elapsed / 1000, 10, 10);
            this.world.ClearForces();
        });
    };
    onContact = (contactPtr) => {
        const contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
        let bodyA = contact.GetFixtureA().GetBody();
        let bodyB = contact.GetFixtureB().GetBody();
        const objA = bodyA.gameObject || bodyA;
        const objB = bodyB.gameObject || bodyB;
        if (objA.type === 'pickaxe') {
            if (objB.type !== 'pickaxe' && objB.type !== 'player')
                this.unregisterObj(objA);
            if (objB.type === 'boulder')
                objB.break(true);
            if (objB.type === 'rock')
                this.unregisterObj(objB);
        }
        if (objB.type === 'pickaxe') {
            if (objA.type !== 'pickaxe' && objA.type !== 'player')
                this.unregisterObj(objB);
            if (objA.type === 'boulder')
                objA.break(true);
            if (objA.type === 'rock')
                this.unregisterObj(objA);
        }
    };

    constructor(debugCanvas, graphicsCanvas, showDebugView) {
        this.debugCanvas = debugCanvas;
        this.graphicsCanvas = graphicsCanvas;
        this.showDebugView = showDebugView;
        window.game = this;
    }

    toggleDebugView () {
        this.graphics.toggleDebugView();
    }

    async start() {
        perf.start();

        // world (physics)
        Box2D = await box2DLoader();
        let { b2World, b2Vec2 } = Box2D;
        let gravity = new b2Vec2(0, 10);
        this.world = new b2World(gravity);
        this.world.width = 16;
        this.world.height = 9;
        this.setupContactListener();
        this.gameObjects = {};
        this.callbacks = [];
        this.destroying = {};

        // all graphics, normal and debug
        this.graphics = new Graphics(this.graphicsCanvas, this, this.world, this.debugCanvas, Box2D, this.showDebugView);

        // objects
        this.initializeMap();
        this.player = new Player(Box2D, this.world, this.graphics, this);

        // time
        this.totalTime = 0;
        let timeStep = 1000 / fps;
        this.time = new Time(timeStep);
        statsHeap.timeStep = timeStep;
        this.time.run(this.updatePhysics, this.updateGraphics);
    }

    async restart() {
        this.time.stop();
        await this.start();
    }

    initializeMap() {
        // TODO 2.1 using map 2-dimensional array, create the static objects
        /*
        * ' ' - empty cell
        * 'x' - a wall
        * Use new Spawn(this, this.world, this.graphics, x, y, wallSize)
        * 's' - Spawn
        * */
    }

    registerObj(obj) {
        let id = uuid.v4();
        obj.id = id;
        this.gameObjects[id] = obj;
    }

    unregisterObj(objOrId) {
        let id;
        if (objOrId.id)
            id = objOrId.id;
        else if (typeof objOrId === 'string')
            id = objOrId;
        else
            throw new Error(`Bad unregister id ${objOrId}`);

        if (this.destroying[id])
            return;
        this.callbacks.push(() => {
            const obj = this.gameObjects[id];
            if (!obj) // already destroyed
                return;
            if (obj.destructor)
                obj.destructor();
            else {
                if (obj.image) {
                    obj.image.remove();
                    delete obj.image;
                }
                this.world.DestroyBody(obj);
            }
            delete this.gameObjects[id];
            delete this.destroying[id];
        });
    }

    makeRectangleBody(x, y, width, height, dynamic) {
        // TODO 2.2 make a body with target parameters
        /*
        * The body center must be located in x, y and it should have a rectangular shape
        * it should have only one fixture, of size width x height
        * The body coordinates are already set correctly
        *
        * To set body's shape, you'll need Box2D.b2PolygonShape() and its method SetAsBox(halfWidth, halfHeight)
        * To connect everything together, you'll need to call body.CreateFixture(b2Shape shape, double density)
        *
        * You also need to set the dynamic flag correctly. It's done via
        * setting type on bodyDefinition - use set_type(Box2D.b2_dynamicBody)
        * */
        // Add a parameter 'dynamic' to this method's signature, and set the type based on it
        if ((!x && x !== 0) || (!y && y !== 0)) {
            console.warn('Bad x/y', x, y);
            return null;
        }
        const bodyDef = new Box2D.b2BodyDef();
        const pos = new Box2D.b2Vec2(x, y);
        bodyDef.set_position(pos);
        const body = this.world.CreateBody(bodyDef);

        return body;
    }

    trySpawnBoulders() {
        if (!this.lastSpawnTime)
            this.lastSpawnTime = 0;
        let existingBoulders = Object.values(this.gameObjects).filter(o => o.type === 'boulder');
        let spawns = Object.values(this.gameObjects).filter(o => o.type === 'spawn');
        if ((this.totalTime - this.lastSpawnTime > 3000)) {
            if (existingBoulders.length >= 12) {
                let counter = 0;
                existingBoulders.forEach(b => counter++ < spawns.length ? b.break() : null);
            }
            Object.values(this.gameObjects).filter(o => o.type === 'spawn').forEach(sp => {
                new Boulder(this, sp, this.world, Box2D, this.graphics);
            });
            this.lastSpawnTime = this.totalTime;
        }
    }

    tryCleanRocks() {
        if (!this.lastCleanTime)
            this.lastCleanTime = 0;
        let existingRocks = Object.values(this.gameObjects).filter(o => o.type === 'rock');
        let spawns = Object.values(this.gameObjects).filter(o => o.type === 'spawn');
        if ((this.totalTime - this.lastCleanTime > 1000) && existingRocks.length > spawns.length * 10) {
            let counter = 0;
            existingRocks.forEach(r => counter++ < spawns.length * 3 ? this.unregisterObj(r) : null);
            this.lastCleanTime = this.totalTime;
        }
    }

    setupContactListener() {
        const listener = new Box2D.JSContactListener();
        listener.BeginContact = this.onContact;
        listener.EndContact = function () {
        };
        listener.PreSolve = function () {
        };
        listener.PostSolve = function () {
        };
        this.world.SetContactListener(listener);
    }

    processCallbacks() {
        while (this.callbacks.length > 0) {
            this.callbacks.shift()();
        }
    }
}
