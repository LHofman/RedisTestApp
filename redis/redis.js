const redis = require('redis');
const client = redis.createClient();
const DEFAULT_EXPIRATION = 120;

client.on('connect', function () {
    console.log('connected');
});

function throwError(err, reply) {
    if (err) {
        console.log(err);
    }
}

module.exports.set = function (key, value) {
    return new Promise(resolve => {
        client.set(key, value, throwError);
    });
}
module.exports.setEx = function (key, value, expiration = DEFAULT_EXPIRATION) {
    client.setex(key, expiration, value, throwError);
}
module.exports.setList = function (key, values) {
    return new Promise(resolve => {
        const promises = [];
        for (const value of values)
            promises.push(client.rpush(key, value, throwError));
        Promise.all(promises).then(resolve);
    })
}
module.exports.setListEx = function (key, values, expiration = DEFAULT_EXPIRATION) {
    return new Promise(resolve => {
        this.setList(key, values).then(client.expire(key, expiration)).then(resolve);
    });

}
module.exports.setObject = function (key, values) {
    client.hmset(key, values, throwError);
}
module.exports.setObjectEx = function (key, values, expiration = DEFAULT_EXPIRATION) {
    this.setObject(key, values);
    client.expire(key, expiration);
}
module.exports.get = function (key) {
    return new Promise((resolve, reject) => {
        this.checkKey(key).then(() =>
            client.get(key, (err, reply) => {
                if (err) {
                    reject(err);
                }
                resolve(reply);
            })
        ).catch(err => reject(err));
    });
}
module.exports.getList = function (key) {
    return new Promise((resolve, reject) => {
        this.checkKey(key).then(() =>
            client.lrange(key, 0, -1, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(reply);
            })
        ).catch(err => reject(err));
    });
}
module.exports.getAll = function (key) {
    return new Promise((resolve, reject) => {
        this.checkKey(key).then(() =>
            client.hgetall(key, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(reply);
            })
        ).catch(err => reject(err));
    });
}
module.exports.removeFromList = function(key, value) {
    client.lrem(key, 0, value);
}
module.exports.delete = function (key) {
    client.del(key, (err, reply) => {
        if (err) {
            console.log(err);
            return;
        }
        return reply;
    });
}
module.exports.getAllKeys = function () {
    return new Promise((resolve) => {
        client.keys('*', (err, keys) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(keys);
        });
    });
}
module.exports.checkKey = function (key) {
    return new Promise((resolve, reject) => {
        client.exists(key, (err, reply) => {
            if (err) reject(err);
            else if (reply === 0) reject('KEY_NOT_FOUND');
            else if (reply === 1) resolve();
        })
    });
}