import React from 'react';

export default class Sprites extends React.PureComponent {
    render() {
        return <div style={{ display: 'none' }}>
            <img id="pickaxe" src={require('./pickaxe.png')}/>
            <img id="spelunky" src={require('./spelunky.png')}/>
            <img id="lava" src={require('./lava.png')}/>
        </div>;
    }
}
