import Q from 'q';
import statsHeap from './stats-heap';
import {mean} from 'simple-statistics';
import keyMirror from 'keymirror';
import {get} from 'lodash-es';
import Time from '../Time';

const perf = {};
const buffers = [];

export const Measures = keyMirror({
    PhysicsFrameTime: null,
    RenderFrameTime: null,
    PhysicsFrameEvent: null,
    RenderFrameEvent: null,
    RealFrameEvent: null,
});

export const Stats = keyMirror({
    AvgPhysicsFrameTime: null,
    AvgRenderFrameTime: null,
    AvgTotalFrameTime: null,
    JSMemUsed: null,
    JSMemTotal: null,
    PhysicsFPS: null,
    RenderFPS: null,
    RealFPS: null,
});

const flushInterval = 1000;

perf.start = () => {
    const time = new Time(flushInterval);
    time.setInterval(perf.flushBuffer, () => {
    });
    requestAnimationFrame(perf.startRealFPSMeter);
};

perf.startRealFPSMeter = () => {
    perf.markEvent(Measures.RealFrameEvent);
    requestAnimationFrame(perf.startRealFPSMeter);
};

let accumulatedTime = 0;
let lastFlushTime = 0;

perf.measureFPSStat = function (frameEvent, debug, debugName, fpsStat) {
    const frameEvents = buffers[frameEvent] || [];
    const newFrameEvents = [];
    const measuredFrameEvents = [];
    let leftTimeEvensCount = 0;
    for (let i = 0; i < frameEvents.length; ++i) {
        const frameHappenedAt = frameEvents[i];
        if (frameHappenedAt < lastFlushTime) {
            // do not measure, somehow we missed it, do not keep
            leftTimeEvensCount++;
        } else if (frameHappenedAt < lastFlushTime + flushInterval) {
            // what we measure, do not keep
            measuredFrameEvents.push(frameHappenedAt);
        } else {
            // happened later, do not measure, but keep
            newFrameEvents.push(frameHappenedAt);
        }
    }
    if (debug)
        console.log(debugName, measuredFrameEvents.length, newFrameEvents.length, leftTimeEvensCount);
    statsHeap[fpsStat] = measuredFrameEvents.length / (flushInterval / 1000);
    buffers[frameEvent] = newFrameEvents;
};
perf.measureAvgFrameTimeStat = function (frameTimeMeasure, avgFrameTimeStat) {
    const frameTimes = buffers[frameTimeMeasure] || [];
    statsHeap[avgFrameTimeStat] = frameTimes.length ? mean(frameTimes) : 0;
    buffers[frameTimeMeasure] = [];
};
perf.measureFrameStats = function (avgFrameTimeStat, frameTimeMeasure, frameEvent, debugName, fpsStat, debug = false) {
    perf.measureAvgFrameTimeStat(frameTimeMeasure, avgFrameTimeStat);
    perf.measureFPSStat(frameEvent, debug, debugName, fpsStat);
};
perf.flushBuffer = (timeElapsed) => {
    accumulatedTime += timeElapsed;
    if (accumulatedTime >= flushInterval) {
        try {
            perf.measureFrameStats(
                Stats.AvgPhysicsFrameTime, Measures.PhysicsFrameTime,
                Measures.PhysicsFrameEvent, 'physics', Stats.PhysicsFPS
            );
            perf.measureFrameStats(
                Stats.AvgRenderFrameTime, Measures.RenderFrameTime,
                Measures.RenderFrameEvent, 'render', Stats.RenderFPS
            );
            perf.measureFPSStat(Measures.RealFrameEvent, false, 'real', Stats.RealFPS);
            statsHeap[Stats.AvgTotalFrameTime] = statsHeap[Stats.AvgRenderFrameTime] + statsHeap[Stats.AvgPhysicsFrameTime];

            // if (performance.memory) {
            //   statsHeap[Stats.JSMemUsed] = performance.memory.usedJSHeapSize / 1024 / 1024;
            //   statsHeap[Stats.JSMemTotal] = performance.memory.totalJSHeapSize / 1024 / 1024;
            // }
        } catch (e) {
            console.error(e);
        } finally {
            lastFlushTime = performance.now();
        }
    }
};

perf.usingMeasure = (measure, fn) => {
    const start = `${measure}-start`;
    const end = `${measure}-end`;
    performance.mark(start);
    const called = fn();
    if (called && called.then) {
        Q(called).finally(() => performance.mark(end));
    } else {
        performance.mark(end);
    }
    performance.measure(measure, start, end);
    const value = get(performance.getEntriesByName(measure), '0.duration');
    if (value) {
        buffers[measure] = buffers[measure] || [];
        buffers[measure].push(value);
    }

    performance.clearMarks(start);
    performance.clearMarks(end);
    performance.clearMeasures(measure);
    return value;
};

perf.markEvent = (measure) => {
    buffers[measure] = buffers[measure] || [];
    buffers[measure].push(performance.now());
};

export default perf;
