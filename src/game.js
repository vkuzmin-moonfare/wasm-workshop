import box2DLoader from './box2d';
import DebugDraw from './DebugDraw';
import Time from './time';

let Box2D;
const worldWidth = 16;
const worldHeight = 9;
window.scale = 100;

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
    }

    async start() {
        Box2D = await box2DLoader();
        let {b2World, b2Vec2} = Box2D;
        this.world = new b2World(new b2Vec2(0, 1));
        this.world.game = this;
        this.debugDraw = new DebugDraw(this.canvas, this.world, Box2D, worldWidth * window.scale, worldHeight * window.scale);
        this.time = new Time(1000 / 60);
        this.time.setInterval(this.updatePhysics, this.updateRender);
        this.addBoundaries();
        this.addBoulders();
    }

    addBoundaries() {
        this.makeRectangleImpl(this.world, worldWidth / 2, 0, worldWidth, 1, false);
        this.makeRectangleImpl(this.world, 0, worldHeight / 2, 1, worldHeight, false);
        this.makeRectangleImpl(this.world, worldWidth, worldHeight / 2, 1, worldHeight, false);
        this.makeRectangleImpl(this.world, worldWidth / 2, worldHeight, worldWidth, 1, false);
    }

    addBoulders() {
        this.makeRectangleImpl(this.world, worldWidth / 2, 3, 1, 1, true);
        this.makeRectangleImpl(this.world, worldWidth / 2 + 3, 3, 1, 1, true);
        this.makeRectangleImpl(this.world, worldWidth / 2 - 3, 3, 1, 1, true);
    }

    makeRectangleImpl(world, x, y, width, height, dynamic) {
        if ((!x && x !== 0) || (!y && y !== 0)) {
            console.warn('Bad x/y', x, y);
            return null;
        }
        const bodyDef = new Box2D.b2BodyDef();
        if (dynamic)
            bodyDef.set_type(Box2D.b2_dynamicBody);
        const body = world.CreateBody(bodyDef);
        const shape = new Box2D.b2PolygonShape();
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        shape.SetAsBox(halfWidth, halfHeight, new Box2D.b2Vec2(x, y), 0);
        body.CreateFixture(shape, 1);
        shape.__destroy__();
        return body;
    }

    updateRender = () => {

    };

    updatePhysics = (timeSpent) => {
        this.world.Step(timeSpent / 1000, 10, 10);
        this.world.ClearForces();
        this.debugDraw.update();
    };
}
