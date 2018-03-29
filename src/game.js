import box2DLoader from './box2d';
import DebugDraw from './DebugDraw';
import Time from './time';
import Movement from './controls';
import uuid from 'uuid';

let Box2D;
const worldWidth = 16;
const worldHeight = 9;
export default class Game {
    updateRender = () => {

    };

    updatePhysics = (elapsed) => {
        this.totalTime += elapsed;
        this.playerMovement.applyDirection(elapsed);
        this.tryCleanRocks();
        this.trySpawnBoulders();
        this.processCallbacks();
        this.world.Step(elapsed / 1000, 10, 10);
        this.world.ClearForces();
        this.debugDraw.update();
    };

    constructor(canvas) {
        this.canvas = canvas;
    }

    applyProportionateDimensions() {
        const oldWidth = this.canvas.clientWidth;
        const oldHeight = this.canvas.clientHeight;
        let newWidth, newHeight, scale;
        const proportion = oldWidth / oldHeight;
        let rightProportion = worldWidth / worldHeight;
        // newW/newH = worldWidth/WorldHeight
        if (proportion > rightProportion) { // landscape, fit height
            scale = oldHeight / worldHeight;
            newHeight = oldHeight;
            newWidth = rightProportion * newHeight;
        } else { // portrait, fit width
            scale = oldWidth / worldWidth;
            newWidth = oldWidth;
            newHeight = newWidth / rightProportion;
        }
        window.scale = scale;
        this.canvas.style.width = `${newWidth}px`;
        this.canvas.style.height = `${newHeight}px`;
    }

    async start() {
        Box2D = await box2DLoader();
        let { b2World, b2Vec2 } = Box2D;
        this.world = new b2World(new b2Vec2(0, 10));
        this.world.game = this;
        this.totalTime = 0;
        this.applyProportionateDimensions();
        this.debugDraw = new DebugDraw(this.canvas, this.world, Box2D, worldWidth * window.scale, worldHeight * window.scale);
        this.time = new Time(1000 / 60);
        this.gameObjects = {};
        this.callbacks = [];
        this.addBoundaries();
        this.addBoulderSpawns();
        this.player = this.addPlayer();
        this.playerMovement = new Movement(this.player, Box2D);
        this.time.setInterval(this.updatePhysics, this.updateRender);
    }

    addBoundaries() {
        this.makeRectangleImpl(worldWidth / 2, 0, worldWidth, 1, false);
        this.makeRectangleImpl(0, worldHeight / 2, 1, worldHeight, false);
        this.makeRectangleImpl(worldWidth, worldHeight / 2, 1, worldHeight, false);
        this.makeRectangleImpl(worldWidth / 2, worldHeight, worldWidth, 1, false);
    }

    addBoulderSpawns() {
        const spawn1 = this.makeRectangleImpl(worldWidth / 2, 0.5, 0.5, 0.5, false);
        spawn1.type = 'spawn';
        const spawn2 = this.makeRectangleImpl(worldWidth / 2 + 3, 0.5, 0.5, 0.5, false);
        spawn2.type = 'spawn';
        const spawn3 = this.makeRectangleImpl(worldWidth / 2 - 3, 0.5, 0.5, 0.5, false);
        spawn3.type = 'spawn';
        this.registerObj(spawn1);
        this.registerObj(spawn2);
        this.registerObj(spawn3);
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
        this.callbacks.push(() => {
            const obj = this.gameObjects[id];
            this.world.DestroyBody(obj);
            delete this.gameObjects[id];
        });

    }

    addPlayer() {
        const width = 0.5;
        const height = 1.2;
        const x = worldWidth / 2;
        const y = worldHeight - 1;
        const bodyDef = new Box2D.b2BodyDef();
        bodyDef.set_type(Box2D.b2_dynamicBody);
        const body = this.world.CreateBody(bodyDef);
        body.SetFixedRotation(true);
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        let bodyShape = new Box2D.b2PolygonShape();
        let center = new Box2D.b2Vec2(x, y);
        bodyShape.SetAsBox(halfWidth, halfHeight, center, 0);
        body.CreateFixture(bodyShape, 1);
        return body;
    }

    makeRectangleImpl(x, y, width, height, dynamic) {
        if ((!x && x !== 0) || (!y && y !== 0)) {
            console.warn('Bad x/y', x, y);
            return null;
        }
        const bodyDef = new Box2D.b2BodyDef();
        const pos = new Box2D.b2Vec2(x, y);
        if (dynamic)
            bodyDef.set_type(Box2D.b2_dynamicBody);
        bodyDef.set_position(pos);
        const body = this.world.CreateBody(bodyDef);
        bodyDef.__destroy__();
        pos.__destroy__();
        const shape = new Box2D.b2PolygonShape();
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        shape.SetAsBox(halfWidth, halfHeight);
        body.CreateFixture(shape, 1);
        shape.__destroy__();
        return body;
    }

    trySpawnBoulders() {
        if (!this.lastSpawnTime)
            this.lastSpawnTime = 0;
        let existingBoulders = Object.values(this.gameObjects).filter(o => o.type === 'boulder');
        if ((this.totalTime - this.lastSpawnTime > 3000)) {
            if (existingBoulders.length >= 3) {
                let counter = 0;
                existingBoulders.forEach(b => counter++ < 3 ? this.breakBoulder(b) : null);
            }
            Object.values(this.gameObjects).filter(o => o.type === 'spawn').forEach(sp => {
                const spawnPos = sp.GetWorldCenter();
                const boulder = this.makeRectangleImpl(spawnPos.get_x(), spawnPos.get_y() + 1, 0.5, 0.5, true);
                boulder.type = 'boulder';
                this.registerObj(boulder);
            });
            this.lastSpawnTime = this.totalTime;
        }
    }

    breakBoulder(body) {
        const spawnPos = body.GetPosition();
        this.unregisterObj(body);
        this.callbacks.push(() => {
            for (let i = 0; i < 3; ++i) {
                const rock = this.makeRectangleImpl(spawnPos.get_x() + (Math.random() - 0.5),
                    spawnPos.get_y(), Math.random() / 4, Math.random() / 4, true);
                rock.type = 'rock';
                this.registerObj(rock);
            }
        })
    }

    tryCleanRocks() {
        if (!this.lastCleanTime)
            this.lastCleanTime = 0;
        let existingRocks = Object.values(this.gameObjects).filter(o => o.type === 'rock');
        if ((this.totalTime - this.lastCleanTime > 1000) && existingRocks.length > 30) {
            let counter = 0;
            existingRocks.forEach(r => counter++ < 9 ? this.unregisterObj(r) : null);
        }
    }

    processCallbacks() {
        while (this.callbacks.length > 0) {
            this.callbacks.shift()();
        }
    }
}
