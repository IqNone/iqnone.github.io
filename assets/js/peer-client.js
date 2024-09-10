function PeerClient(name, masterId) {
    const eventEmitter = new EventEmitter();

    this.on = (event, callback) => eventEmitter.on(event, callback);

    let master = null;
    const peer = new Peer(null, {
        debug: 2
    });

    peer.on('open', (id) => {
        peer.id = id;

        eventEmitter.emit('start');

        master = peer.connect(masterId, {
            reliable: true
        });

        master.on('open', () => {
            master.send({
                name,
                op: 'name'
            });
        });

        master.on('data', (data) => {
            switch (data.op) {
                case 'session':
                    eventEmitter.emit('session', data.session);
                    break;
                case 'player-joined':
                    eventEmitter.emit('player-joined', data.player);
                    break;
                case 'player-name-changed':
                    eventEmitter.emit('player-name-changed', data.player);
                    break;
                case 'start-voting':
                    eventEmitter.emit('start-voting', data.description);
                    break;
                case 'player-left':
                    eventEmitter.emit('player-left', data.player);
                    break;
                case 'cast-vote':
                    eventEmitter.emit('cast-vote', data.player);
                    break;
                case 'show-results':
                    eventEmitter.emit('show-results');
                    break;
                case 'reset':
                    eventEmitter.emit('reset');
                    break;
            }
        });
    });

    this.getId = () => peer.id;

    this.setName = (name) => {
        if (master) {
            master.send({
                name,
                op: 'name'
            });
        }
    }

    this.castVote = (v) => {
        if (master) {
            master.send({
                op: 'cast-vote',
                vote: v
            });
        }
    }
}
