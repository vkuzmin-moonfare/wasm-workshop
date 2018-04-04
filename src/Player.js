import Controls from './Controls/Controls';

let Box2D;
class Player {
    constructor(b2D, world, graphics, game) {
        Box2D = b2D;
        this.world = world;
        this.game = game;
        this.graphics = graphics;

        // body
        const width = 0.5;
        const height = 0.5;
        const x = this.world.width / 2;
        const y = this.world.height - 1;
        const bodyDef = new Box2D.b2BodyDef();
        bodyDef.set_type(Box2D.b2_dynamicBody);
        let center = new Box2D.b2Vec2(x, y);
        bodyDef.set_position(center);
        const body = this.world.CreateBody(bodyDef);
        body.SetFixedRotation(true);
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        let bodyShape = new Box2D.b2PolygonShape();
        bodyShape.SetAsBox(halfWidth, halfHeight);
        body.CreateFixture(bodyShape, 1);
        this.body = body;
        this.body.gameObject = this;
        bodyDef.__destroy__();
        center.__destroy__();
        this.type = 'player';

        // graphics and controls
        this.image = this.graphics.getSquareSprite('spelunky', 0, 16, 16, 64, 80, 0.5, body.GetPosition());
        this.controls = new Controls(body, Box2D);
        const d = 0.5;
        this.offsetByDir = {
            U: new Box2D.b2Vec2(0, -d),
            UR: new Box2D.b2Vec2(d, -d),
            R: new Box2D.b2Vec2(d, 0),
            DR: new Box2D.b2Vec2(d, d),
            D: new Box2D.b2Vec2(0, d),
            DL: new Box2D.b2Vec2(-d, d),
            L: new Box2D.b2Vec2(-d, 0),
            UL: new Box2D.b2Vec2(-d, -d),
        };

        this.game.registerObj(this);
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
            const pickaxeSize = 0.3;
            const body = this.game.makeRectangleImpl(x, y, pickaxeSize, pickaxeSize, true);
            body.type = 'pickaxe';
            body.SetBullet(true);
            body.image = this.graphics.getSquareSprite('pickaxe', 0, 0, 75, 75, 75, pickaxeSize, body.GetPosition());
            body.SetGravityScale(0.5);
            this.game.registerObj(body);
            const impulseVec = new Box2D.b2Vec2(offsetX, offsetY);
            impulseVec.op_mul(50);
            body.ApplyForceToCenter(impulseVec);
            body.SetAngularVelocity(8);
            impulseVec.__destroy__();
            this.lastShootTime = this.game.totalTime;
        }
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
        this.conrols = null;
        Object.values(this.offsetByDir).forEach(vec => vec.__destroy__());
    }
}

export default Player;
