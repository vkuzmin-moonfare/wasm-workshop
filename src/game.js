import box2DLoader from './box2d';
import DebugDraw from './DebugDraw';
import Time from './time';

let Box2D;
export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
        window.scale = 10;
        window.worldWidth = 16;
        window.worldHeight = 9;
    }

    async start() {
        Box2D = await box2DLoader();
        let {b2World} = Box2D;
        this.world = new b2World();
        this.world.game = this;
        this.debugDraw = new DebugDraw(this.canvas, this.world, Box2D);
        this.time = new Time(1000 / 60);
        this.time.setInterval(this.updatePhysics, this.updateRender);
        this.addBoundaries();
    }

    addBoundaries() {
        this.makeRectangleImpl(this.world, 0, 0, 10, 5, false);
        this.makeRectangleImpl(this.world, 0, 0, 5, 6, false);
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
