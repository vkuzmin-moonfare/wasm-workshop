export default class Pickaxe {
    constructor(game, graphics, x, y) {
        const pickaxeSize = 0.3;
        const body = game.makeRectangleBody(x, y, pickaxeSize, pickaxeSize, true);
        body.type = 'pickaxe';
        body.SetBullet(true);
        body.image = graphics.getImageFromSprite('pickaxe', 0, 0, 75, 75, 75, pickaxeSize, body.GetPosition());
        body.SetGravityScale(0.5);
        game.registerObj(body);
        return body;
    }
}