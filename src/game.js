import box2DLoader from './box2d';
import DebugDraw from './DebugDraw';
import Time from './time';
import Movement from './controls';
import uuid from 'uuid';
import Paper from 'paper';

let Box2D;
const worldWidth = 16;
const worldHeight = 9;
const vec2Point = (vec) => {
    return new Paper.Point(vec.get_x() * window.scale, vec.get_y() * window.scale);
};
export default class Game {
    updateGraphics = () => {
        Object.values(this.gameObjects).forEach(obj => {
            if (obj.image) {
                obj.image.position = vec2Point(obj.GetPosition());
                const newAngleRad = obj.GetTransform().get_q().GetAngle();
                const newAngleDeg = newAngleRad / Math.PI * 180;
                if (!obj.image.oldRot)
                    obj.image.oldRot = newAngleDeg;
                obj.image.rotate(newAngleDeg - obj.image.oldRot);
                obj.image.oldRot = newAngleDeg;
            }
        });
        Paper.view.draw();
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
    onContact = (contactPtr) => {
        const contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
        const bodyA = contact.GetFixtureA().GetBody();
        const bodyB = contact.GetFixtureB().GetBody();
        if (bodyA.type === 'bullet') {
            if (bodyB.type !== 'bullet' && bodyB.type !== 'player')
                this.unregisterObj(bodyA);
            if (bodyB.type === 'boulder')
                this.breakBoulder(bodyB);
            if (bodyB.type === 'rock')
                this.unregisterObj(bodyB);
        }
        if (bodyB.type === 'bullet') {
            if (bodyA.type !== 'bullet' && bodyA.type !== 'player')
                this.unregisterObj(bodyB);
            if (bodyA.type === 'boulder')
                this.breakBoulder(bodyA);
            if (bodyA.type === 'rock')
                this.unregisterObj(bodyA);
        }
    };

    constructor(debugCanvas, graphicsCanvas) {
        this.debugCanvas = debugCanvas;
        this.graphicsCanvas = graphicsCanvas;
    }

    applyProportionateDimensions() {
        const oldWidth = this.debugCanvas.clientWidth;
        const oldHeight = this.debugCanvas.clientHeight;
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
        this.debugCanvas.style.width = `${newWidth}px`;
        this.debugCanvas.style.height = `${newHeight}px`;
        this.graphicsCanvas.style.width = `${newWidth}px`;
        this.graphicsCanvas.style.height = `${newHeight}px`;
    }

    async start() {
        Box2D = await box2DLoader();
        let { b2World, b2Vec2 } = Box2D;
        this.world = new b2World(new b2Vec2(0, 10));
        this.world.game = this;
        this.setupContactListener();
        this.totalTime = 0;
        this.applyProportionateDimensions();
        this.debugDraw = new DebugDraw(this.debugCanvas, this.world, Box2D, worldWidth * window.scale, worldHeight * window.scale);
        Paper.setup(this.graphicsCanvas);
        this.time = new Time(1000 / 60);
        this.gameObjects = {};
        this.callbacks = [];
        this.destroying = {};
        this.addBoundaries();
        this.addBoulderSpawns();
        this.player = this.addPlayer();
        this.registerObj(this.player);
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
        this.time.setInterval(this.updatePhysics, this.updateGraphics);
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
                if (obj.image)
                    obj.image.remove();
                delete obj.image;
                this.world.DestroyBody(obj);
                delete this.gameObjects[id];
                delete this.destroying[id];
            });
        }

    }

    addPlayer() {
        const width = 0.5;
        const height = 0.5;
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
        // graphics
        body.image = this.getSquareSprite('spelunky', 0, 16, 16, 64, 80, 0.5, body.GetPosition());
        return body;
    }

    getSquareSprite(name, xOffset, yOffset, xSize, totalX, totalY, physicalSize, physicalPos) {
        const raster = new Paper.Raster(name);
        const position = vec2Point(physicalPos);
        const fitToSize = physicalSize * window.scale;
        raster.position = new Paper.Point(position.x + (totalX / 2 - xOffset - xSize / 2), position.y + (totalY / 2 - yOffset - xSize / 2));
        const path = new Paper.Shape.Rectangle({
            position: position,
            size: new Paper.Size(xSize, xSize),
        });
        const group = new Paper.Group([path, raster]);
        group.scale(fitToSize / xSize);
        group.clipped = true;
        return group;
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
            const bulletSize = 0.3;
            const bullet = this.makeRectangleImpl(x, y, bulletSize, bulletSize, true);
            bullet.type = 'bullet';
            bullet.SetBullet(true);
            bullet.image = this.getSquareSprite('pickaxe', 0, 0, 75, 75, 75, bulletSize, bullet.GetPosition());
            bullet.SetGravityScale(0.5);
            this.registerObj(bullet);
            const impulseVec = new Box2D.b2Vec2(offsetX, offsetY);
            impulseVec.op_mul(50);
            bullet.ApplyForceToCenter(impulseVec);
            bullet.SetAngularVelocity(8);
            impulseVec.__destroy__();
            this.lastShootTime = this.totalTime;
        }
    }

    getAngle(v1, v2) {
        return Math.atan2(v1.x * v2.y - v1.y * v2.x, v1.x * v2.x + v1.y * v2.y);
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
