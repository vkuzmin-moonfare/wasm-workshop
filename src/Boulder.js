class Boulder {
    constructor(game, spawn, world, Box2D, graphics) {
        const spawnPos = spawn.GetWorldCenter();
        let boulderSize = 0.5;
        let shift = new Box2D.b2Vec2(world.width / 2 - spawnPos.get_x(), world.height / 2 - spawnPos.get_y());
        shift.Normalize();
        shift.op_mul(boulderSize);
        this.body = game.makeRectangleImpl(spawnPos.get_x() + shift.get_x(), spawnPos.get_y() + shift.get_y(), boulderSize, boulderSize, true);
        this.type = 'boulder';
        this.body.gameObject = this;
        this.world = world;
        shift.Normalize();
        shift.op_mul(100);
        this.body.ApplyForceToCenter(shift);
        this.graphics = graphics;
        shift.__destroy__();
        this.image = graphics.getSquareSprite('spelunky', 16, 48, 16, 64, 80, boulderSize, this.body.GetPosition());
        game.registerObj(this);
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

export default Boulder;
