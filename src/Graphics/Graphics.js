import Paper from "paper";

class Graphics {
    constructor(canvas, game) {
        this.game = game;
        Paper.setup(canvas);
        const background = new Paper.Path.Rectangle(Paper.view.bounds);
        background.fillColor = '#201F33';
        background.sendToBack();
    }

    update(objects) {
        Object.values(objects).forEach(obj => {
            if (obj.updateImage)
                obj.updateImage();
            else if (obj.image) {
                obj.image.position = this.game.vec2Point(obj.GetPosition());
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
        const position = this.game.vec2Point(physicalPos);
        const fitToSize = physicalSize * this.game.scale;
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
