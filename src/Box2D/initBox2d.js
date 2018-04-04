let initializing = null;
let InitBox2d = null;

const Box2DLoader = require('./Box2D_v2.2.1_debug.wasm.js');

const initBox2D = async () => {
    if (InitBox2d)
        return InitBox2d;
    if (initializing)
        return initializing;
    initializing = Box2DLoader()
        .then((result) => {
            InitBox2d = result;
            result.then = null;
            return result;
        });
    return initializing;
};

export default initBox2D;
