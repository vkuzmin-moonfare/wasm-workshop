import box2DLoader from './Box2D/initBox2d';
import DebugDraw from './Box2D/DebugDraw';
import Time from './Time/Time';
import Controls from './Controls/Controls';
import uuid from 'uuid';
import Paper from 'paper';
import perf, {Measures} from './Stats/perf';
import statsHeap from './Stats/stats-heap';
import Player from "./Player";

let Box2D;

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
            Object.values(this.gameObjects).forEach(obj => {
                if (obj.updateImage)
                    obj.updateImage();
                else if (obj.image) {
                    obj.image.position = this.vec2Point(obj.GetPosition());
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

    vec2Point(vec) {
        return new Paper.Point(vec.get_x() * this.scale, vec.get_y() * this.scale);
    }

    applyProportionateDimensions(canvas) {
        // newW/newH = worldWidth/worldHeight

        const oldWidth = canvas.clientWidth;
        const oldHeight = canvas.clientHeight;
        let newWidth, newHeight, scale;
        const proportion = oldWidth / oldHeight;
        let rightProportion = this.world.width / this.world.height;
        if (proportion > rightProportion) { // landscape, fit height
            scale = oldHeight / this.world.height;
            newHeight = oldHeight;
            newWidth = (rightProportion * newHeight).toFixed(0);
        } else { // portrait, fit width
            scale = oldWidth / this.world.width;
            newWidth = oldWidth;
            newHeight = (newWidth / rightProportion).toFixed(0);
        }
        this.scale = scale;
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
    }

    async start() {
        perf.start();
        Box2D = await box2DLoader();
        let { b2World, b2Vec2 } = Box2D;
        let gravity = new b2Vec2(0, 10);
        this.world = new b2World(gravity);
        this.world.width = 16;
        this.world.height = 9;
        this.setupContactListener();

        this.applyProportionateDimensions(this.debugCanvas);
        this.applyProportionateDimensions(this.graphicsCanvas);
        this.debugDraw = new DebugDraw(this.debugCanvas, this.world, Box2D, this.world.width * this.scale, this.world.height * this.scale, this.scale);
        this.initPaperJs();

        this.gameObjects = {};
        this.callbacks = [];
        this.destroying = {};
        this.initializeMap();
        this.player = new Player(Box2D, this.world, this, this);
        this.totalTime = 0;
        let timeStep = 1000 / 30;
        this.time = new Time(timeStep);
        statsHeap.timeStep = timeStep;

        this.time.run(this.updatePhysics, this.updateGraphics);
    }

    initPaperJs() {
        Paper.setup(this.graphicsCanvas);
        const background = new Paper.Path.Rectangle(Paper.view.bounds);
        background.fillColor = '#201F33';
        background.sendToBack();
    }

    initializeMap() {
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

    getSquareSprite(name, xOffset, yOffset, xSize, totalX, totalY, physicalSize, physicalPos) {
        const raster = new Paper.Raster(name);
        const position = this.vec2Point(physicalPos);
        const fitToSize = physicalSize * this.scale;
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
                let shift = new Box2D.b2Vec2(this.world.width / 2 - spawnPos.get_x(), this.world.height / 2 - spawnPos.get_y());
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
                    point: this.vec2Point(rock.GetPosition()),
                    size: new Paper.Size(width * this.scale, height * this.scale),
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
