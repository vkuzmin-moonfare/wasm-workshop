import React from 'react';
import Game from './game';

export default class GameArea extends React.Component {
    go = () => {
        this.game = new Game(this.canvas);
        this.game.start();
    };

    saveCanvas = (canvas) => {
        this.canvas = canvas;
    };

    render() {
        return <div className="game-area">
            <canvas width={100} height={100} ref={this.saveCanvas}/>
            <button onClick={this.go}>START</button>
        </div>
    }
}
