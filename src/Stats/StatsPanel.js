import React from 'react';
import './StatsPanel.css';
import {compose, lifecycle} from 'recompose';
import statsHeap from './stats-heap';
import {Stats} from './perf';

const formatNumber = (x) => {
  return Number(x).toFixed(3);
};

let StatsPanel = () => {
  // eslint-disable-next-line no-mixed-operators
  const emccHeapMB = 0; // window.Box2D.HEAP8.length * 8 / 1024 / 1024;
  return (<div className="stats">
    <div className="header">Debug info:</div>
    <div className="row">
      <span className="name">EMCC Heap:</span>
      <span className="value">{formatNumber(emccHeapMB)}MB</span>
    </div>
    <div className="row">
      <span className="name">Time step:</span>
      <span className="value">{formatNumber(statsHeap.timeStep)}ms</span>
    </div>
    <div className="row">
      <span className="name">Avg physics frame time:</span>
      <span className="value">{formatNumber(statsHeap[Stats.AvgPhysicsFrameTime])}ms</span>
    </div>
    <div className="row">
      <span className="name">Avg render frame time:</span>
      <span className="value">{formatNumber(statsHeap[Stats.AvgRenderFrameTime])}ms</span>
    </div>
    <div className="row">
      <span className="name">Avg total frame time:</span>
      <span className="value">{formatNumber(statsHeap[Stats.AvgTotalFrameTime])}ms</span>
    </div>
    <div className="row">
      <span className="name">PhysicsFPS:</span>
      <span className="value">{formatNumber(statsHeap[Stats.PhysicsFPS])}</span>
    </div>
    <div className="row">
      <span className="name">RenderFPS:</span>
      <span className="value">{formatNumber(statsHeap[Stats.RenderFPS])}</span>
    </div>
    <div className="row">
      <span className="name">Real FPS:</span>
      <span className="value">{formatNumber(statsHeap[Stats.RealFPS])}</span>
    </div>
    {/*<div className="row">*/}
    {/*<span className="name">JS Heap:</span>*/}
    {/*<span className="value">{formatNumber(statsHeap[Stats.JSMemUsed])}/*/}
    {/*{formatNumber(statsHeap[Stats.JSMemTotal])}MB</span>*/}
    {/*</div>*/}
  </div>);
};

let timer;
StatsPanel = compose(
  lifecycle({
    componentDidMount() {
      timer = setInterval(() => this.forceUpdate(), 1000);
    },
    componentWillUnmount() {
      clearInterval(timer);
    },
  }))(StatsPanel);

export default StatsPanel;
