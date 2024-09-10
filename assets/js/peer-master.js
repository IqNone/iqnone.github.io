function PeerMaster(name) {
    const eventEmitter = new EventEmitter();

    this.on = (event, callback) => eventEmitter.on(event, callback);

    const peer = new Peer(null, {
        debug: 2
    });
    const clients = [];

    const session = {
        state: 'idle',
        description: '',
        results: [],
        players: []
    }

    peer.on('open', (id) => {
        peer.id = id;
        peer.name = name;

        session.players.push({name: peer.name, id: peer.id, master: true});

        eventEmitter.emit('start');
    });

    peer.on('connection', function (connection) {
        const client = {
            connection,
            id: connection.peer,
            initialized: false
        };

        clients.push(client);

        connection.on('data', (data) => {
            switch (data.op) {
                case 'name':
                    setClientName(client, data.name);
                    break;
                case 'cast-vote':
                    setClientVote(client, data.vote);
                    break;
            }
        });

        connection.on('close', () => {
            const ic = clients.indexOf(client);
            if (ic >= 0) {
                clients.splice(ic, 1);
            }
            const ip = session.players.findIndex((p) => p.id === client.id);
            if (ip >= 0) {
                session.players.splice(ip, 1);
            }
            eventEmitter.emit('player-left', {id: client.id});
            sendAll({
                player: {id: client.id},
                op: 'player-left'
            });
        });
    });

    function setClientName(client, name) {
        client.name = name;
        const op = client.initialized ? 'player-name-changed' : 'player-joined';
        const player = {
            name,
            id: client.id
        };

        if (!client.initialized) {
            client.connection.send({
                op: 'session',
                session: session
            });

            session.players.push(player);
        } else {
            session.players.find((p) => player.id === p.id).name = name;
        }

        client.initialized = true;

        eventEmitter.emit(op, player);
        sendAll({op, player});
    }

    function setClientVote(client, vote) {
        const player = session.players.find((p) => client.id === p.id);
        player.vote = vote;
        eventEmitter.emit('cast-vote', {vote, id: client.id});
        sendAll({
            op: 'cast-vote',
            player: {
                vote,
                id: client.id,
            }
        });
    }

    function sendAll(data) {
        clients
            .filter((c) => c.initialized)
            .forEach((c) => c.connection.send(data));
    }

    this.getId = () => peer.id;
    this.setName = (name) => {
        peer.name = name;
        session.players[0].name = name;

        event = {
            op: 'player-name-changed',
            player: {
                name,
                id: peer.id
            }
        };

        sendAll(event);
        eventEmitter.emit(event.op, event.player)
    }

    this.startVoting = (description) => {
        session.state = 'voting';
        session.description = description;
        session.players.forEach((p) => p.vote = null);
        sendAll({
            description,
            op: 'start-voting'
        });
    }

    this.castVote = (v) => {
        session.players[0].vote = v;
        sendAll({
            op: 'cast-vote',
            player: {
                id: peer.id,
                vote: v
            }
        });
    }

    this.showResults = () => {
        session.state = 'results';
        sendAll({op: 'show-results'});
    }

    this.reset = () => {
        session.state = 'idle';
        session.description = '';
        sendAll({op: 'reset'});
    }
}
