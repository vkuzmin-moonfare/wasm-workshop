import Paper from "paper";
import DebugDraw from "../Box2D/DebugDraw";

class Graphics {
    constructor(graphicsCanvas, game, world, debugCanvas, Box2D, showDebugView) {
        this.game = game;
        this.world = world;
        this.applyProportionateDimensions(graphicsCanvas);
        this.applyProportionateDimensions(debugCanvas);
        this.debugDraw = new DebugDraw(debugCanvas, this.world, Box2D, this.world.width * this.scale, this.world.height * this.scale, this.scale);
        this.showDebugView = showDebugView;
        Paper.setup(graphicsCanvas);
        const background = new Paper.Path.Rectangle(Paper.view.bounds);
        background.fillColor = '#201F33';
        background.sendToBack();
    }

    vec2Point(vec) {
        return new Paper.Point(vec.get_x() * this.scale, vec.get_y() * this.scale);
    }

    toggleDebugView() {
        this.showDebugView = !this.showDebugView;
        if (!this.showDebugView)
            this.debugDraw.clear();
    }

    applyProportionateDimensions(canvas) {
        // newW/newH = worldWidth/worldHeight
        const oldWidth = canvas.clientWidth;
        const oldHeight = canvas.clientHeight;
        let newWidth, newHeight, scale;
        const proportion = oldWidth / oldHeight;
        let rightProportion = this.world.width / this.world.height;
        if (proportion > rightProportion) { // landscape, fit height
            scale = oldHeight / this.world.height;
            newHeight = oldHeight;
            newWidth = (rightProportion * newHeight).toFixed(0);
        } else { // portrait, fit width
            scale = oldWidth / this.world.width;
            newWidth = oldWidth;
            newHeight = (newWidth / rightProportion).toFixed(0);
        }
        this.scale = scale;
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
    }

    update(objects) {
        if (this.showDebugView)
            this.debugDraw.update();
        Object.values(objects).forEach(obj => {
            if (obj.updateImage)
                obj.updateImage();
            else if (obj.image) {
                obj.image.position = this.vec2Point(obj.GetPosition());
                const newAngleRad = obj.GetTransform().get_q().GetAngle();
                const newAngleDeg = newAngleRad / Math.PI * 180;
                if (!obj.image.oldRot)
                    obj.image.oldRot = newAngleDeg;
                obj.image.rotate(newAngleDeg - obj.image.oldRot);
                obj.image.oldRot = newAngleDeg;
            }
        });
        Paper.view.draw();
    }

    getSquareSprite(name, xOffset, yOffset, xSize, totalX, totalY, physicalSize, physicalPos) {
        const raster = new Paper.Raster(name);
        const position = this.vec2Point(physicalPos);
        const fitToSize = physicalSize * this.scale;
        raster.position = new Paper.Point(position.x + (totalX / 2 - xOffset - xSize / 2), position.y + (totalY / 2 - yOffset - xSize / 2));
        const path = new Paper.Shape.Rectangle({
            position: position,
            size: new Paper.Size(xSize, xSize),
        });
        const group = new Paper.Group([path, raster]);
        group.scale(fitToSize / xSize);
        group.clipped = true;
        return group;
    }
}

export default Graphics;
