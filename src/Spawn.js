class Spawn {
    constructor(game, world, graphics, x, y) {
        this.body = game.makeRectangleImpl(x, y, 0.1, 0.1, false);
        this.type = 'spawn';
        this.body.gameObject = this;
        this.world = world;
        this.graphics = graphics;
        this.image = graphics.getSquareSprite('lava', 0, 0, 32, 32, 32, 1, this.body.GetPosition());
        game.registerObj(this);
    }

    updateImage() {

    }

    destructor() {
        this.image.remove();
        this.world.DestroyBody(this.body);
        this.image = null;
        this.body.gameObject = null;
        this.body = null;
    }
}

export default Spawn;
