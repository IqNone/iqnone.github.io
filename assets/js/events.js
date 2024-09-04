function EventEmitter() {

    const callbacks = {};

    this.on = (event, cb) => {
        if (!callbacks[event]) {
            callbacks[event] = [];
        }
        callbacks[event].push(cb);
    }

    this.emit = (event, data) => {
        const cbs = callbacks[event]
        if (cbs) {
            cbs.forEach(cb => cb(data));
        }
    }
}