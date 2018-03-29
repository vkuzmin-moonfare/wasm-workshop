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
        this.tryShoot();
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
        this.setupContactListener();
        this.totalTime = 0;
        this.applyProportionateDimensions();
        this.debugDraw = new DebugDraw(this.canvas, this.world, Box2D, worldWidth * window.scale, worldHeight * window.scale);
        this.time = new Time(1000 / 60);
        this.gameObjects = {};
        this.callbacks = [];
        this.destroying = {};
        this.addBoundaries();
        this.addBoulderSpawns();
        this.player = this.addPlayer();
        this.playerMovement = new Movement(this.player, Box2D);
        const d = 0.5;
        this.offsetByDir = {
            U: new b2Vec2(0, -d),
            UR: new b2Vec2(d, -d),
            R: new b2Vec2(d, 0),
            DR: new b2Vec2(d, d),
            D: new b2Vec2(0, d),
            DL: new b2Vec2(-d, d),
            L: new b2Vec2(-d, 0),
            UL: new b2Vec2(-d, -d),
        };
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

        if (!this.destroying[id]) {
            this.destroying[id] = true;
            this.callbacks.push(() => {
                const obj = this.gameObjects[id];
                this.world.DestroyBody(obj);
                delete this.gameObjects[id];
                delete this.destroying[id];
            });
        }

    }

    addPlayer() {
        const width = 0.5;
        const height = 1.2;
        const x = worldWidth / 2;
        const y = worldHeight - 1;
        const bodyDef = new Box2D.b2BodyDef();
        bodyDef.set_type(Box2D.b2_dynamicBody);
        let center = new Box2D.b2Vec2(x, y);
        bodyDef.set_position(center);
        const body = this.world.CreateBody(bodyDef);
        bodyDef.__destroy__();
        center.__destroy__();
        body.SetFixedRotation(true);
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        let bodyShape = new Box2D.b2PolygonShape();
        bodyShape.SetAsBox(halfWidth, halfHeight);
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
            if (existingBoulders.length >= 12) {
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
                    spawnPos.get_y(), Math.max(0.05, Math.random() / 4), Math.max(0.05, Math.random() / 4), true);
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

    tryShoot() {
        if (!this.lastShootTime)
            this.lastShootTime = 0;
        let shootDirection = this.playerMovement.getShootDirection();
        let offsetByDir = this.offsetByDir[shootDirection];
        if ((this.totalTime - this.lastShootTime > 100) && offsetByDir) {
            const playerPos = this.player.GetPosition();
            let offsetX = offsetByDir.get_x();
            let x = playerPos.get_x() + offsetX;
            let offsetY = offsetByDir.get_y();
            let y = playerPos.get_y() + offsetY;
            const bullet = this.makeRectangleImpl(x, y, 0.1, 0.1, true);
            bullet.type = 'bullet';
            bullet.SetBullet(true);
            this.registerObj(bullet);
            const rightDir = this.offsetByDir.R;
            const impulseVec = new Box2D.b2Vec2(offsetX, offsetY);
            impulseVec.op_mul(50);
            bullet.ApplyForceToCenter(impulseVec);
            impulseVec.__destroy__();
            this.lastShootTime = this.totalTime;
        }
    }

    getAngle(v1, v2) {
        return Math.atan2(v1.x * v2.y - v1.y * v2.x, v1.x * v2.x + v1.y * v2.y);
    }

    onContact = (contactPtr) => {
        const contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
        const bodyA = contact.GetFixtureA().GetBody();
        const bodyB = contact.GetFixtureB().GetBody();
        if (bodyA.type === 'bullet') {
            this.unregisterObj(bodyA);
            if (bodyB.type === 'boulder')
                this.breakBoulder(bodyB);
        }
        if (bodyB.type === 'bullet') {
            this.unregisterObj(bodyB);
            if (bodyA.type === 'boulder')
                this.breakBoulder(bodyA);
        }
    };

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
