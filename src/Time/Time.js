const startBreakableTimer = (callback, step) => {
    const timer = setInterval(() => {
        try {
            callback();
        } catch (e) {
            console.log('BREAK by error, time survived:', performance.now());
            clearInterval(timer);
            throw e;
        }
    }, step);
    return timer;
};

class Time {
    constructor(timeStep) {
        this.timeStep = timeStep;
    }

    run(physics, render) {
        let lastCheck = performance.now();
        this.accumulator = 0;
        this.lock = false;
        this.count = 0;

        const clampTime = 200;

        this.timer1 = startBreakableTimer(() => {
            this.count = 0;
        }, clampTime);

        const timerWork = () => {
            if (this.lock) {
                console.warn('skipping frame due to lock, performance problem?');
                return;
            }
            this.lock = true;
            try {
                const currentTime = performance.now();
                const frameTime = Math.min(currentTime - lastCheck, this.timeStep);
                lastCheck = currentTime;

                this.accumulator += frameTime;

                render(frameTime);
                while (this.accumulator >= this.timeStep) {
                    this.accumulator -= this.timeStep;
                    if (this.count < clampTime / this.timeStep) {
                        physics(this.timeStep);
                        this.count++;
                    }
                }
            } finally {
                this.lock = false;
            }
        };
        this.timer2 = startBreakableTimer(timerWork, this.timeStep);
    }

    stop() {
        clearInterval(this.timer1);
        clearInterval(this.timer2);
    }
}

export default Time;
