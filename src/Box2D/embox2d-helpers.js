export default (Box2D) => {
    const helpers = {};
    helpers.using = function using(ns, pattern) {
        if (pattern == undefined) {
            // import all
            for (var name in ns) {
                this[name] = ns[name];
            }
        } else {
            if (typeof (pattern) === 'string') {
                pattern = new RegExp(pattern);
            }
            // import only stuff matching given pattern
            for (var name in ns) {
                if (name.match(pattern)) {
                    this[name] = ns[name];
                }
            }
        }
    };


//to replace original C++ operator =
    helpers.copyVec2 = function copyVec2(vec) {
        return new Box2D.b2Vec2(vec.get_x(), vec.get_y());
    };

//to replace original C++ operator * (float)
    helpers.scaleVec2 = function scaleVec2(vec, scale) {
        vec.set_x(scale * vec.get_x());
        vec.set_y(scale * vec.get_y());
    };

//to replace original C++ operator *= (float)
    helpers.scaledVec2 = function scaledVec2(vec, scale) {
        return new Box2D.b2Vec2(scale * vec.get_x(), scale * vec.get_y());
    };


// http://stackoverflow.com/questions/12792486/emscripten-bindings-how-to-create-an-accessible-c-c-array-from-javascript
    helpers.createChainShape = function createChainShape(vertices, closedLoop) {
        const shape = new Box2D.b2ChainShape();
        const buffer = Box2D.allocate(vertices.length * 8, 'float', Box2D.ALLOC_STACK);
        let offset = 0;
        for (let i = 0; i < vertices.length; i++) {
            Box2D.setValue(buffer + (offset), vertices[i].get_x(), 'float'); // x
            Box2D.setValue(buffer + (offset + 4), vertices[i].get_y(), 'float'); // y
            offset += 8;
        }
        const ptr_wrapped = Box2D.wrapPointer(buffer, Box2D.b2Vec2);
        if (closedLoop)
            shape.CreateLoop(ptr_wrapped, vertices.length);
        else
            shape.CreateChain(ptr_wrapped, vertices.length);
        return shape;
    };

    helpers.createPolygonShape = function createPolygonShape(vertices) {
        const shape = new Box2D.b2PolygonShape();
        const buffer = Box2D.allocate(vertices.length * 8, 'float', Box2D.ALLOC_STACK);
        let offset = 0;
        for (let i = 0; i < vertices.length; i++) {
            Box2D.setValue(buffer + (offset), vertices[i].get_x(), 'float'); // x
            Box2D.setValue(buffer + (offset + 4), vertices[i].get_y(), 'float'); // y
            offset += 8;
        }
        const ptr_wrapped = Box2D.wrapPointer(buffer, Box2D.b2Vec2);
        shape.Set(ptr_wrapped, vertices.length);
        return shape;
    };

    helpers.createRandomPolygonShape = function createRandomPolygonShape(radius) {
        let numVerts = 3.5 + Math.random() * 5;
        numVerts |= 0;
        const verts = [];
        for (let i = 0; i < numVerts; i++) {
            const angle = i / numVerts * 360.0 * 0.0174532925199432957;
            verts.push(new b2Vec2(radius * Math.sin(angle), radius * -Math.cos(angle)));
        }
        return createPolygonShape(verts);
    };
    return helpers;
};
