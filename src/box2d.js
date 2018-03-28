let initializing = null;
let Box2D = null;

const Box2DLoader = require('./Box2D_v2.2.1_debug.wasm.js');

const initBox2D = async () => {
    if (Box2D)
        return Box2D;
    if (initializing)
        return initializing;
    initializing = Box2DLoader()
        .then((result) => {
            Box2D = result;
            result.then = null;
            return result;
        });
    return initializing;
};

export default initBox2D;
