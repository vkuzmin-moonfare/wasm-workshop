import React from 'react';
import Game from './Game';
import initBox2D from "./Box2D/initBox2d";
import './App.css';
import Sprites from './Graphics/Sprites';
import StatsPanel from "./Stats/StatsPanel";

export default class App extends React.Component {
    state = {
        started: false,
        loading: false,
    };

    start = async () => {
        this.setState({loading: true});
        this.game = new Game(this.debugCanvas, this.graphicsCanvas, false);
        await this.game.start();
        this.setState({started: true, loading: false});
    };

    testBox2D = async () => {
        console.time('load');
        try {
            const Box2D = await initBox2D();
            const vec = new Box2D.b2Vec2(0, 0);
            vec.__destroy__();
            console.log('success!');
        } catch (e) {
            console.error(e);
        }
        console.timeEnd('load');
    };

    saveDebugCanvas = (canvas) => {
        this.debugCanvas = canvas;
    };

    saveGraphicsCanvas = (canvas) => {
        this.graphicsCanvas = canvas;
    };

    componentDidMount() {
        // TODO 1.4 - add setTimeout(this.start)
        setTimeout(this.start);
    }

    render() {
        return <div className="interface">
            <div className="canvas">
                <canvas className="graphicsCanvas" width={1} height={1} ref={this.saveGraphicsCanvas}/>
                <canvas className="debugCanvas" width={1} height={1} ref={this.saveDebugCanvas}/>
                <Sprites/>
                {!this.state.started && <div className="fullHeight controlsLevel">
                    {!this.state.loading && <div className="controlsLevel">
                        <button onClick={this.testBox2D}>Test Box2D</button>
                        <button onClick={this.start}>Start!</button>
                    </div>}
                    {this.state.loading && <div>Loading...</div>}
                </div>}
            </div>
            <div className="debugControls">
                <button onClick={() => this.game.restart()}>Restart</button>
                <button onClick={() => this.game.toggleDebugView()}>Toggle debugView</button>
            </div>
            <StatsPanel/>
        </div>
    }
}
