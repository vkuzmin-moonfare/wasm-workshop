import Rock from "./Rock";

let Box2D;
class Boulder {
    constructor(game, spawn, world, b2d, graphics) {
        const spawnPos = spawn.body.GetWorldCenter();
        let boulderSize = 0.5;
        Box2D = b2d;
        let shift = new Box2D.b2Vec2(world.width / 2 - spawnPos.get_x(), world.height / 2 - spawnPos.get_y());
        shift.Normalize();
        shift.op_mul(boulderSize);
        this.body = game.makeRectangleBody(spawnPos.get_x() + shift.get_x(), spawnPos.get_y() + shift.get_y(), boulderSize, boulderSize, true);
        this.type = 'boulder';
        this.body.gameObject = this;
        this.game = game;
        this.world = world;
        shift.Normalize();
        shift.op_mul(100);
        this.body.ApplyForceToCenter(shift);
        this.graphics = graphics;
        shift.__destroy__();
        this.image = graphics.getImageFromSprite('spelunky', 16, 48, 16, 64, 80, boulderSize, this.body.GetPosition());
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

    break(accelerateRocks) {
        const spawnPos = this.body.GetPosition();
        this.game.unregisterObj(this);
        let game = this.game;
        let world = this.world;
        let graphics = this.graphics;
        this.game.callbacks.push(() => {
            // TODO 4.1 Create 3 objects Rock(graphics, world, game, spawnPos, Box2D, accelerateRocks)

        })
    }

}

export default Boulder;
