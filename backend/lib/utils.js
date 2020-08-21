/* Exports */
module.exports = {
    sendToOne: (clients, users, data, user, type) => {
        for(var client in clients) {
            if(clients[client].un == user) {
                if(type == 'message') {
                    clients[client].con.write(JSON.stringify(data));
                }

                if(type == 'role') {
                    clients[client].role = data.role;
                    users[clients[client].id].role = data.role;
                }
            }
        }
    },

    sendToAll: (clients, data) => {
        for(var client in clients) {
            if(clients[client].role > 1 && (data.info === 'connection' || data.info === 'disconnection')) {
                data.user.ip = module.exports.getUserByID(clients, data.user.id).ip;
            } else if(data.user) {
                delete data.user.ip;
            }

            clients[client].con.write(JSON.stringify(data));
        }
    },

    sendBack: (clients, data, user) => {
        clients[user.con.id].con.write(JSON.stringify(data));
    },

    checkUser: (clients, user) => {
        for(var client in clients) {
            if(clients[client].un === user) {
                return true;
            }
        }
        return false;
    },

    getUserByName: (clients, name) => {
        for(client in clients) {
            if(clients[client].un === name) {
                return clients[client];
            }
        }
    },

    getUserByID: (clients, id) => {
        for(client in clients) {
            if(clients[client].id === id) {
                return clients[client];
            }
        }
    },

    normalizePort: (val) => {
        var port = parseInt(val, 10);

        if(isNaN(port)) {
            return val;
        }

        if(port >= 0) {
            return port;
        }

        return false;
    }
}