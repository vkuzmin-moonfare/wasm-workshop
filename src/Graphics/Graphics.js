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

    getImageFromSprite(name, xOffset, yOffset, xSize, totalX, totalY, physicalSize, physicalPos) {
        const position = this.vec2Point(physicalPos);
        const raster = new Paper.Raster(name);
        const scaleTo = physicalSize * this.scale / xSize;
        raster.position = Graphics.getRasterAbsolutePosition(totalX, xOffset, xSize, totalY, yOffset, position);
        const path = new Paper.Shape.Rectangle({
            position: position,
            size: new Paper.Size(xSize, xSize),
            strokeColor: 'red',
        });

        // TODO 3.2 - cut a rectangle out of the sprite
        /*
        * You will need a group of paper objects via Paper.Group([path1, path2, etc]) and return it here
        * instead of this rectangle
        * If a group has a property group.clipped = true, then its first element will be considered a mask
        * Therefore, you'll need to create such a group [path, raster], so that the rectangle is over the raster in the correct place
        * Apart from that, you will need to scale the image according to the window dimensions. This is done via
        * method group.scale(scaleTo). scaleTo is already calculated for you correctly
        * */
        const group = new Paper.Group([path, raster]);
        group.scale(scaleTo);
        group.clipped = true;
        return group;
    }

    static getRasterAbsolutePosition(totalX, xOffset, xSize, totalY, yOffset, position) {
        // TODO 3.1 Set the correct raster position
        /*
        * Your goal is, knowing:
        * 1. coordinates in the Paper space (position.x, position.y),
        * 2. correct offset inside the sprite (xOffset, yOffset),
        * 3. and the total sprite size (totalX, totalY),
        * create a point with coordinates (position.x + dX), (position.y + dY), where
        * dX - shift to the left to aim at the target picture
        * dY - shift to the top to aim at the target picture
        *
        * */
        let dX = (totalX / 2 - xOffset - xSize / 2);
        let dY = (totalY / 2 - yOffset - xSize / 2);
        // console.log(name, `xOffset=${xOffset}, yOffset=${yOffset}, xSize=${xSize}, totalX=${totalX}, totalY=${totalY}, dX=${dX}, dY=${dY}`);
        return new Paper.Point(position.x + dX, position.y + dY);
    }
}

export default Graphics;
