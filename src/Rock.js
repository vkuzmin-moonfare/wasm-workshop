import Paper from "paper";

class Rock {
    constructor(graphics, world, game, spawnPos) {
        this.world = world;
        this.graphics = graphics;
        this.game = game;

        let width = Math.max(0.05, Math.random() / 4);
        let height = Math.max(0.05, Math.random() / 4);
        const body = this.game.makeRectangleImpl(spawnPos.get_x() + (Math.random() - 0.5),
            spawnPos.get_y(), width, height, true);
        this.image = new Paper.Shape.Rectangle({
            point: this.game.vec2Point(body.GetPosition()),
            size: new Paper.Size(width * this.scale, height * this.scale),
            strokeColor: 'brown',
            fillColor: 'brown',
        });
        this.body = body;
        this.body.gameObject = this;
        this.type = 'rock';
        this.game.registerObj(this);
    }

    updateImage() {
        this.image.position = this.game.vec2Point(this.body.GetPosition());
        const newAngleRad = this.body.GetTransform().get_q().GetAngle();
        const newAngleDeg = newAngleRad / Math.PI * 180;
        if (!this.image.oldRot)
            this.image.oldRot = newAngleDeg;
        this.image.rotate(newAngleDeg - this.image.oldRot);
        this.image.oldRot = newAngleDeg;
    }

    destructor() {
        this.image.remove();
        this.world.DestroyBody(this.body);
        this.image = null;
        this.body.gameObject = null;
        this.body = null;
    }
}

export default Rock;
