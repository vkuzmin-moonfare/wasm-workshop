import React, {Component} from 'react';
import './App.css';

let initialized = false;
let initializing = null;

const initBox2D = async () => {
    if (initialized)
        return window.Box2D;
    if (initializing)
        return initializing;
    initializing = window.Box2D()
        .then((result) => {
            initialized = true;
            result.then = null;
            window.Box2D = result;
            return result;
        });
    return initializing;
};

class App extends Component {
    testBox2D = async () => {
        try {
            await initBox2D();
            const Vec2 = window.Box2D.b2Vec2;
            new Vec2(0, 0);
            console.log('success!');
        } catch (e) {
            console.error(e);
        }
    };

    render() {
        return (
            <div className="app">
                <button onClick={this.testBox2D}>TEST box2d</button>
            </div>
        );
    }
}

export default App;
