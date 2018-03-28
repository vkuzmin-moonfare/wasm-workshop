export default (Box2D, context, helpers, b2p) => {
    const emboxDebugDraw = {};
    emboxDebugDraw.drawAxes = function drawAxes(ctx) {
        ctx.strokeStyle = 'rgb(192,0,0)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(1, 0);
        ctx.stroke();
        ctx.strokeStyle = 'rgb(0,192,0)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 1);
        ctx.stroke();
    };

    emboxDebugDraw.setColorFromDebugDrawCallback = function setColorFromDebugDrawCallback(color) {
        const col = Box2D.wrapPointer(color, Box2D.b2Color);
        const red = (col.get_r() * 255) | 0;
        const green = (col.get_g() * 255) | 0;
        const blue = (col.get_b() * 255) | 0;
        const colStr = `${red},${green},${blue}`;
        context.fillStyle = `rgba(${colStr},0.5)`;
        context.strokeStyle = `rgb(${colStr})`;
    };

    emboxDebugDraw.drawSegment = function drawSegment(vert1, vert2) {
        const vert1V = Box2D.wrapPointer(vert1, Box2D.b2Vec2);
        const vert2V = Box2D.wrapPointer(vert2, Box2D.b2Vec2);
        context.beginPath();
        context.moveTo(b2p(vert1V.get_x()), b2p(vert1V.get_y()));
        context.lineTo(b2p(vert2V.get_x()), b2p(vert2V.get_y()));
        context.stroke();
    };

    emboxDebugDraw.drawPolygon = function drawPolygon(vertices, vertexCount, fill) {
        context.beginPath();
        for (let tmpI = 0; tmpI < vertexCount; tmpI++) {
            const vert = Box2D.wrapPointer(vertices + (tmpI * 8), Box2D.b2Vec2);
            if (tmpI === 0)
                context.moveTo(b2p(vert.get_x()), b2p(vert.get_y()));
            else
                context.lineTo(b2p(vert.get_x()), b2p(vert.get_y()));
        }
        context.closePath();
        if (fill)
            context.fill();
        context.stroke();
    };

    emboxDebugDraw.drawCircle = function drawCircle(center, radius, axis, fill) {
        const centerV = Box2D.wrapPointer(center, Box2D.b2Vec2);
        const axisV = Box2D.wrapPointer(axis, Box2D.b2Vec2);

        context.beginPath();
        context.arc(b2p(centerV.get_x()), b2p(centerV.get_y()), b2p(radius), 0, 2 * Math.PI, false);
        if (fill)
            context.fill();
        context.stroke();

        if (fill) {
            //render axis marker
            const vert2V = helpers.copyVec2(centerV);
            vert2V.op_add(helpers.scaledVec2(axisV, radius));
            context.beginPath();
            context.moveTo(b2p(centerV.get_x()), b2p(centerV.get_y()));
            context.lineTo(b2p(vert2V.get_x()), b2p(vert2V.get_y()));
            context.stroke();
        }
    };

    emboxDebugDraw.drawTransform = function drawTransform(transform) {
        const trans = Box2D.wrapPointer(transform, Box2D.b2Transform);
        const pos = trans.get_p();
        const rot = trans.get_q();

        context.save();
        context.translate(b2p(pos.get_x()), b2p(pos.get_y()));
        context.scale(0.5, 0.5);
        context.rotate(rot.GetAngle());
        context.lineWidth *= 2;
        emboxDebugDraw.drawAxes(context);
        context.restore();
    };

    emboxDebugDraw.getCanvasDebugDraw = function getCanvasDebugDraw() {
        const debugDraw = new Box2D.JSDraw();

        debugDraw.DrawSegment = function (vert1, vert2, color) {
            emboxDebugDraw.setColorFromDebugDrawCallback(color);
            emboxDebugDraw.drawSegment(vert1, vert2);
        };

        debugDraw.DrawPolygon = function (vertices, vertexCount, color) {
            emboxDebugDraw.setColorFromDebugDrawCallback(color);
            emboxDebugDraw.drawPolygon(vertices, vertexCount, false);
        };

        debugDraw.DrawSolidPolygon = function (vertices, vertexCount, color) {
            emboxDebugDraw.setColorFromDebugDrawCallback(color);
            emboxDebugDraw.drawPolygon(vertices, vertexCount, true);
        };

        debugDraw.DrawCircle = function (center, radius, color) {
            emboxDebugDraw.setColorFromDebugDrawCallback(color);
            const dummyAxis = Box2D.b2Vec2(0, 0);
            emboxDebugDraw.drawCircle(center, radius, dummyAxis, false);
        };

        debugDraw.DrawSolidCircle = function (center, radius, axis, color) {
            emboxDebugDraw.setColorFromDebugDrawCallback(color);
            emboxDebugDraw.drawCircle(center, radius, axis, true);
        };

        debugDraw.DrawTransform = function (transform) {
            emboxDebugDraw.drawTransform(transform);
        };

        return debugDraw;
    };
    return emboxDebugDraw;
};
