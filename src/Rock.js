import Paper from "paper";

class Rock {
    constructor(graphics, world, game, spawnPos, Box2D, accelerate) {
        this.world = world;
        this.graphics = graphics;
        this.game = game;

        let width = Math.max(0.1, Math.random() / 4);
        let height = Math.max(0.1, Math.random() / 4);
        const body = this.game.makeRectangleBody(spawnPos.get_x() + (Math.random() - 0.5),
            spawnPos.get_y(), width, height, true);
        this.image = new Paper.Shape.Rectangle({
            point: this.graphics.vec2Point(body.GetPosition()),
            size: new Paper.Size(width * this.graphics.scale, height * this.graphics.scale),
        });
        this.image.strokeColor = '#733e39';
        this.image.fillColor = '#733e39';
        this.body = body;
        if (accelerate) {
            const impulseVec = new Box2D.b2Vec2(Math.random(), Math.random());
            impulseVec.Normalize();
            impulseVec.op_mul(0.01);
            this.body.ApplyLinearImpulse(impulseVec, Math.random() * Math.PI * 2);
            impulseVec.__destroy__();
        }
        this.body.gameObject = this;
        this.type = 'rock';
        this.game.registerObj(this);
    }

    updateImage() {
        this.image.position = this.graphics.vec2Point(this.body.GetPosition());
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
