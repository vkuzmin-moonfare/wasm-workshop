let initializing = null;
let InitBox2d = null;

// TODO 1.2 - change to require or import from a local folder, ./Box2D_v2.2.1_debug.wasm.js
const Box2DLoader = window.Box2D;

const initBox2D = async () => {
    if (InitBox2d)
        return InitBox2d;
    if (initializing)
        return initializing;
    initializing = Box2DLoader()
        .then((result) => {
            InitBox2d = result;
            result.then = null; // TODO 1.2 - попробуйте закомментировать и посмотреть что получится
            return result;
        });
    return initializing;
};

export default initBox2D;
