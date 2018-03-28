import React from 'react';
import Game from './game';
import initBox2D from "./box2d";
import './Interface.css';

export default class Interface extends React.Component {
    state = {
        started: false,
        loading: false,
    };

    start = async () => {
        this.setState({ loading: true });
        this.game = new Game(this.canvas);
        await this.game.start();
        this.setState({ started: true, loading: false });
    };

    testBox2D = async () => {
        console.time('load');
        try {
            const Box2D = await initBox2D();
            const Vec2 = Box2D.b2Vec2;
            new Vec2(0, 0);
            console.log('success!');
        } catch (e) {
            console.error(e);
        }
        console.timeEnd('load');
    };

    saveCanvas = (canvas) => {
        this.canvas = canvas;
    };

    render() {
        return <div className="interface">
            <canvas className="game" width={1} height={1} ref={this.saveCanvas}/>
            {!this.state.started && <div className="fullHeight controlsLevel">
                {!this.state.loading && <div className="controlsLevel">
                    <button onClick={this.testBox2D}>Test Box2D</button>
                    <button onClick={this.start}>Start!</button>
                </div>}
                {this.state.loading && <div>Loading...</div>}
            </div>}
        </div>
    }
}
