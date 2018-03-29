import React from 'react';

export default class Sprites extends React.PureComponent {
    render() {
        return <div style={{ display: 'none' }}>
            <img id="pickaxe" src={require('./pick_axe.png')}/>
            <img id="spelunky" src={require('./spelunky_shop.png')}/>
        </div>;
    }
}
