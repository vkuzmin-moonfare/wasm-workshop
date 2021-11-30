# wasm-workshop

Wasm workshop

Author: Valeriy Kuzmin, Moonfare

### Prerequisites
1. git
2. node.js v8.x
3. yarn, (npm will do too)
4. Your favorite js editor
5. Chrome, Firefox or Edge

### Tasks

##### (1) Connecting emscripten module

1. Turn off the dumb loading in index.html
1. Change window.Box2D initBox2d.js to use require or import
1. Fix `start.js/serverConfig`, adding correct mime-type for *.wasm
1. Add `this.start()` to `App/componentDidMount` 

##### (2) Creating Box2D objects

1. Implement Game/makeRectangleBody
1. Implement Game/initializeMap

##### (3) Drawing sprites via paper.js

1. Calculate the correct coordinates in `Graphics/getRasterAbsolutePosition`
1. Change the drawing logic in `Graphics/getImageFromSprite` to be a sprite + a cutting contour

##### (4) Implementing the game logic

You may need this manual: http://www.learn-cocos2d.com/api-ref/1.0/Box2D/html/index.html

1. In `Boulder/tryBreak` add creation of several `Rock` objects
1. In `Player/tryShoot` add creation of `Pickaxe` object
