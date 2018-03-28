import helpersFactory from './embox2d-helpers';
import debugDrawFactory from './embox2d-html5canvas-debugDraw';

const e_shapeBit = 0x0001;
const e_jointBit = 0x0002;
// const e_aabbBit = 0x0004;
// const e_pairBit = 0x0008;
// const e_centerOfMassBit = 0x0010;

export default class DebugDraw {
    constructor(canvas, world, Box2D) {
        this.world = world;
        const width = window.scale * window.worldWidth;
        const height = window.scale * window.worldHeight;
        this.canvas = canvas;
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d'); // ugly hack for ugly code
        const helpers = helpersFactory(Box2D);
        const emboxDebugDraw = debugDrawFactory(Box2D, this.context, helpers, (l) => l * window.scale);
        const debugDraw = emboxDebugDraw.getCanvasDebugDraw();
        debugDraw.SetFlags(e_shapeBit | e_jointBit);
        this.world.SetDebugDraw(debugDraw);
    }

    update() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.world.DrawDebugData();
    }
};

