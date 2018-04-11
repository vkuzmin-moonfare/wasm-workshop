export default class Wall {
    constructor(game, world, graphics, x, y, wallSize) {
        const body = game.makeRectangleBody(x, y, wallSize, wallSize, false);
        body.type = 'wall';
        game.registerObj(body);
        body.image = graphics.getImageFromSprite('spelunky', 0, 32, 16, 64, 80, wallSize, body.GetPosition());
        return body;
    }
}