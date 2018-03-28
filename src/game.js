import box2DLoader from './box2d';
import DebugDraw from './DebugDraw';
import Time from './time';

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
        window.scale = 10;
        window.worldWidth = 16;
        window.worldHeight = 9;
    }

    async start() {
        const Box2D = await box2DLoader();
        let {b2Vec2, b2World} = Box2D;
        this.world = new b2World();
        this.world.game = this;
        this.debugDraw = new DebugDraw(this.canvas, this, Box2D);
        this.time = new Time(1000 / 60);
        this.time.setInterval(this.updatePhysics, this.updateRender);
    }

    updateRender = () => {

    };

    updatePhysics = (timeSpent) => {
        this.world.Step(timeSpent / 1000, 10, 10);
        this.world.ClearForces();
        this.debugDraw.update();
    };
}
