import kb from "./keyboardCodes";

let b2Vec2;
let rightVec;

class Movement {
    keydown = (e) => {
        if (this.knownKeys.indexOf(e.which) > -1)
        {
            this.pressedButtons[kb.k2ch[e.which]] = true;
            this.recalculateAccelerationDirection();
            return false;
        }
        return true;
    };
    keyup = (e) => {
        if (this.knownKeys.indexOf(e.which) > -1)
        {
            this.pressedButtons[kb.k2ch[e.which]] = false;
        }
        this.recalculateAccelerationDirection();
        return false;
    };

    knownKeys = [
        kb.ch2k.Up,
        kb.ch2k.Down,
        kb.ch2k.Left,
        kb.ch2k.Right,
        kb.ch2k.W,
        kb.ch2k.A,
        kb.ch2k.S,
        kb.ch2k.D,
    ];

    constructor(body, Box2D, groundY) {
        this.maxVelocity = 5;
        this.accelerationPerSecond = 5;
        this.decellerationPerSecond = 1;
        this.dragPerSecond = 0.5;
        this.minVelocity = 0.1;
        b2Vec2 = Box2D.b2Vec2;
        rightVec = new b2Vec2(1, 0);
        this.body = body;
        this.body.SetLinearDamping(0);
        this.groundY = groundY;
        this.resetPressedKeys();
        document.addEventListener('keydown', this.keydown);
        document.addEventListener('keyup', this.keyup);
    }

    getShootDirection() {
        let dir = '';
        dir += this.pressedButtons.Up ? 'U' : '';
        dir += this.pressedButtons.Down ? 'D' : '';
        dir += this.pressedButtons.Left ? 'L' : '';
        dir += this.pressedButtons.Right ? 'R' : '';
        return dir;
    }

    applyDirection(elapsedTime) {
        let direction = this.direction;
        let acceleration = elapsedTime / 1000 * this.accelerationPerSecond;
        let drag = elapsedTime / 1000 * this.dragPerSecond;
        let velocity = this.body.GetLinearVelocity();
        let additionalVelocity = new b2Vec2(0, 0);
        let controlsApplied = true;
        let addedVec;
        let contacts = this.body.GetContactList();
        const isGrounded = contacts.ptr !== 0;
        let jumpMultiplier = isGrounded ? 10 : 0;
        if (direction === "W") {
            addedVec = new b2Vec2(0, -acceleration * jumpMultiplier);
            additionalVelocity.op_add(addedVec);
            addedVec.__destroy__();
        }
        else if (direction === "A" || direction === "AS") {
            addedVec = new b2Vec2(-acceleration, 0);
            additionalVelocity.op_add(addedVec);
            addedVec.__destroy__();
        }
        // else if (direction === "S") {
        //     addedVec = new b2Vec2(0, acceleration);
        //     additionalVelocity.op_add(addedVec);
        //     addedVec.__destroy__();
        // }
        else if (direction === "D" || direction === "SD") {
            addedVec = new b2Vec2(acceleration, 0);
            additionalVelocity.op_add(addedVec);
            addedVec.__destroy__();
        }
        else if (direction === "WA") {
            addedVec = new b2Vec2(-acceleration, -acceleration * jumpMultiplier);
            additionalVelocity.op_add(addedVec);
            addedVec.__destroy__();
        }
        else if (direction === "WD") {
            addedVec = new b2Vec2(acceleration, -acceleration * jumpMultiplier);
            additionalVelocity.op_add(addedVec);
            addedVec.__destroy__();
        }
        else if (velocity.Length() > 0) {
            let dragVelocity = new b2Vec2(velocity.get_x(), velocity.get_y());
            dragVelocity.Normalize();
            let multiplier = Math.min(drag, velocity.Length());
            dragVelocity.op_mul(multiplier);
            dragVelocity.set_x(-dragVelocity.get_x());
            dragVelocity.set_y(-dragVelocity.get_y());
            additionalVelocity.op_add(dragVelocity);
            dragVelocity.__destroy__();
            controlsApplied = false;
        }


        if (velocity.Length() > this.minVelocity && controlsApplied) {
            let corr = this._calcCorrAngle(velocity, additionalVelocity);
            if (corr) {
                let decVelocitySize = corr * elapsedTime / 1000 * this.decellerationPerSecond;
                let decelerationVelocity = new b2Vec2(-velocity.x, -velocity.y);
                decelerationVelocity.op_mul(decVelocitySize);
                additionalVelocity.op_add(decelerationVelocity);
                decelerationVelocity.__destroy__();
            }
        }


        let newVelocity = new b2Vec2(velocity.x + additionalVelocity.x, velocity.y + additionalVelocity.y);
        if (newVelocity.Length() > this.maxVelocity) {
            additionalVelocity.Normalize();
            additionalVelocity.op_mul(this.maxVelocity - velocity.Length());
        }
        newVelocity.__destroy__();

        additionalVelocity.op_mul(this.body.GetMass());
        this.body.SetAwake(true);
        this.body.ApplyLinearImpulse(additionalVelocity, this.body.GetWorldCenter());
        additionalVelocity.__destroy__();
        this._normalizeVelocity();
        const transform = this.body.GetTransform();
        // let angle = transform.get_q().GetAngle();
        // if (Math.abs(angle) > Math.Pi / 8)
        //     this.body.ApplyAngularImpulse(Math.sign(angle) * 0.2);
    }

    _normalizeVelocity() {
        let velocity = this.body.GetLinearVelocity();
        if (velocity.Length() > this.maxVelocity) {
            velocity.Normalize();
            velocity.op_mul(this.maxVelocity);
        }
        this.body.SetLinearVelocity(velocity);
    }

    _calcCorrAngle(a, b) {
        let angle = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
        return (1 - Math.cos(angle)) / 2;
    }

    recalculateAccelerationDirection() {
        let p = '';
        p += this.pressedButtons.W ? 'W' : '';
        p += this.pressedButtons.A ? 'A' : '';
        p += this.pressedButtons.S ? 'S' : '';
        p += this.pressedButtons.D ? 'D' : '';

        this.direction = p;
    }

    resetPressedKeys() {
        this.pressedButtons = {};
        this.knownKeys.forEach(code => this.pressedButtons[kb.k2ch[code]] = false);
    }
}

export default Movement;
