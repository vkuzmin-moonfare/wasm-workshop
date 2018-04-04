let initializing = null;
let InitBox2d = null;

// TODO 1.1 - замените на вызов require или import из локальной папки
const Box2DLoader = require('./Box2D_v2.2.1_debug.wasm');

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
