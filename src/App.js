import React, {Component} from 'react';
import './App.css';
import initBox2D from './box2d.js'
import GameArea from './GameArea';

class App extends Component {
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

    render() {
        return (
            <div className="app">
                <button onClick={this.testBox2D}>TEST box2d</button>
                <GameArea/>
            </div>
        );
    }
}

export default App;
