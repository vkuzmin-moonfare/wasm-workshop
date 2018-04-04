import box2DLoader from './Box2D/initBox2d';
import DebugDraw from './Box2D/DebugDraw';
import Time from './time';
import Controls from './Controls';
import uuid from 'uuid';
import Paper from 'paper';
import perf, {Measures} from './perf';
import statsHeap from './stats-heap';

let Box2D;
const worldWidth = 16;
const worldHeight = 9;

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

const vec2Point = (vec) => {
    return new Paper.Point(vec.get_x() * window.scale, vec.get_y() * window.scale);
};

export default class Game {
    updateGraphics = () => {
        perf.markEvent(Measures.RenderFrameEvent);
        perf.usingMeasure(Measures.RenderFrameTime, () => {
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
            this.debugDraw.update();
        });
    };

    updatePhysics = (elapsed) => {
        perf.markEvent(Measures.PhysicsFrameEvent);
        perf.usingMeasure(Measures.PhysicsFrameTime, () => {
            this.totalTime += elapsed;
            this.playerMovement.applyDirection(elapsed);
            this.tryCleanRocks();
            this.trySpawnBoulders();
            this.processCallbacks();
            this.tryShoot();
            this.world.Step(elapsed / 1000, 10, 10);
            this.world.ClearForces();
        });
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
            newWidth = (rightProportion * newHeight).toFixed(0);
        } else { // portrait, fit width
            scale = oldWidth / worldWidth;
            newWidth = oldWidth;
            newHeight = (newWidth / rightProportion).toFixed(0);
        }
        window.scale = scale;
        this.debugCanvas.style.width = `${newWidth}px`;
        this.debugCanvas.style.height = `${newHeight}px`;
        this.graphicsCanvas.style.width = `${newWidth}px`;
        this.graphicsCanvas.style.height = `${newHeight}px`;
    }

    async start() {
        perf.start();
        Box2D = await box2DLoader();
        let { b2World, b2Vec2 } = Box2D;
        this.world = new b2World(new b2Vec2(0, 10));
        this.world.game = this;
        this.setupContactListener();
        this.totalTime = 0;
        this.applyProportionateDimensions();
        this.debugDraw = new DebugDraw(this.debugCanvas, this.world, Box2D, worldWidth * window.scale, worldHeight * window.scale);
        this.initPaperJs();
        let timeStep = 1000 / 30;
        this.time = new Time(timeStep);
        statsHeap.timeStep = timeStep;
        this.gameObjects = {};
        this.callbacks = [];
        this.destroying = {};
        this.drawMap();
        this.player = this.addPlayer();
        this.registerObj(this.player);
        this.playerMovement = new Controls(this.player, Box2D);
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

    initPaperJs() {
        Paper.setup(this.graphicsCanvas);
        const background = new Paper.Path.Rectangle(Paper.view.bounds);
        background.fillColor = '#201F33';
        background.sendToBack();
    }

    drawMap() {
        for (let i = 0; i < map.length; ++i) {
            for (let j = 0; j < map[i].length; ++j) {
                let mapSign = map[i][j];
                let x = wallSize * j + wallSize / 2;
                let y = wallSize * i + wallSize / 2;
                if (mapSign === 'x') {
                    const floor = this.makeRectangleImpl(x, y, wallSize, wallSize, false);
                    this.registerObj(floor);
                    floor.image = this.getSquareSprite('spelunky', 0, 32, 16, 64, 80, wallSize, floor.GetPosition());
                }
                else if (mapSign === 's') {
                    const spawn = this.makeRectangleImpl(x, y, 0.1, 0.1, false);
                    spawn.type = 'spawn';
                    this.registerObj(spawn);
                }
            }
        }
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
        let spawns = Object.values(this.gameObjects).filter(o => o.type === 'spawn');
        if ((this.totalTime - this.lastSpawnTime > 3000)) {
            if (existingBoulders.length >= 12) {
                let counter = 0;
                existingBoulders.forEach(b => counter++ < spawns.length ? this.breakBoulder(b) : null);
            }
            Object.values(this.gameObjects).filter(o => o.type === 'spawn').forEach(sp => {
                const spawnPos = sp.GetWorldCenter();
                let boulderSize = 0.5;
                let shift = new Box2D.b2Vec2(worldWidth/2 - spawnPos.get_x(), worldHeight /2 - spawnPos.get_y());
                shift.Normalize();
                shift.op_mul(boulderSize);
                const boulder = this.makeRectangleImpl(spawnPos.get_x() + shift.get_x(), spawnPos.get_y() + shift.get_y(), boulderSize, boulderSize, true);
                boulder.type = 'boulder';
                shift.Normalize();
                shift.op_mul(100);
                boulder.ApplyForceToCenter(shift);
                shift.__destroy__();
                boulder.image = this.getSquareSprite('spelunky', 16, 48, 16, 64, 80, boulderSize, boulder.GetPosition());
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
                let width = Math.max(0.05, Math.random() / 4);
                let height = Math.max(0.05, Math.random() / 4);
                const rock = this.makeRectangleImpl(spawnPos.get_x() + (Math.random() - 0.5),
                    spawnPos.get_y(), width, height, true);
                rock.type = 'rock';
                rock.image = new Paper.Shape.Rectangle({
                    point: vec2Point(rock.GetPosition()),
                    size: new Paper.Size(width * window.scale, height * window.scale),
                });
                rock.image.fillColor = 'brown';
                rock.image.strokeColor = 'brown';
                this.registerObj(rock);
            }
        })
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
