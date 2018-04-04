import Controls from './Controls/Controls';

let Box2D;
class Player {
    constructor(b2D, world, graphics, game) {
        Box2D = b2D;
        const { b2Vec2 } = Box2D;
        this.world = world;
        this.game = game;
        const width = 0.5;
        const height = 0.5;
        const x = world.width / 2;
        const y = world.height - 1;
        const bodyDef = new Box2D.b2BodyDef();
        bodyDef.set_type(Box2D.b2_dynamicBody);
        let center = new Box2D.b2Vec2(x, y);
        bodyDef.set_position(center);
        const body = world.CreateBody(bodyDef);
        bodyDef.__destroy__();
        center.__destroy__();
        body.SetFixedRotation(true);
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        let bodyShape = new Box2D.b2PolygonShape();
        bodyShape.SetAsBox(halfWidth, halfHeight);
        body.CreateFixture(bodyShape, 1);
        this.image = graphics.getSquareSprite('spelunky', 0, 16, 16, 64, 80, 0.5, body.GetPosition());
        this.graphics = graphics;
        this.controls = new Controls(body, Box2D);
        this.body = body;

        const d = 0.5;
        this.offsetByDir = {
            U: new b2Vec2(0, -d),
            UR: new b2Vec2(d, -d),
            R: new b2Vec2(d, 0),
            DR: new b2Vec2(d, d),
            D: new b2Vec2(0, d),
            DL: new b2Vec2(-d, d),
            L: new b2Vec2(-d, 0),
            UL: new b2Vec2(-d, -d),
        };

        game.registerObj(this);

    }

    updatePhysics(elapsed) {
        this.controls.applyDirection(elapsed);
        this.tryShoot();
    }

    tryShoot() {
        if (!this.lastShootTime)
            this.lastShootTime = 0;
        let shootDirection = this.controls.getShootDirection();
        let offsetByDir = this.offsetByDir[shootDirection];
        if ((this.game.totalTime - this.lastShootTime > 100) && offsetByDir) {
            const playerPos = this.body.GetPosition();
            let offsetX = offsetByDir.get_x();
            let x = playerPos.get_x() + offsetX;
            let offsetY = offsetByDir.get_y();
            let y = playerPos.get_y() + offsetY;
            const bulletSize = 0.3;
            const bullet = this.game.makeRectangleImpl(x, y, bulletSize, bulletSize, true);
            bullet.type = 'bullet';
            bullet.SetBullet(true);
            bullet.image = this.graphics.getSquareSprite('pickaxe', 0, 0, 75, 75, 75, bulletSize, bullet.GetPosition());
            bullet.SetGravityScale(0.5);
            this.game.registerObj(bullet);
            const impulseVec = new Box2D.b2Vec2(offsetX, offsetY);
            impulseVec.op_mul(50);
            bullet.ApplyForceToCenter(impulseVec);
            bullet.SetAngularVelocity(8);
            impulseVec.__destroy__();
            this.lastShootTime = this.game.totalTime;
        }
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
}

export default Player;
