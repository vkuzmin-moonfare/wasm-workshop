import Paper from "paper";

class Rock {
    constructor(graphics, world, game, spawnPos) {
        this.world = world;
        this.graphics = graphics;
        this.game = game;

        let width = Math.max(0.05, Math.random() / 4);
        let height = Math.max(0.05, Math.random() / 4);
        const rock = this.game.makeRectangleImpl(spawnPos.get_x() + (Math.random() - 0.5),
            spawnPos.get_y(), width, height, true);
        rock.type = 'rock';
        rock.image = new Paper.Shape.Rectangle({
            point: this.game.vec2Point(rock.GetPosition()),
            size: new Paper.Size(width * this.scale, height * this.scale),
        });
        rock.image.fillColor = 'brown';
        rock.image.strokeColor = 'brown';
        this.game.registerObj(rock);
    }
}

export default Rock;
