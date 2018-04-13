const redis = require('./redis');

module.exports.getAllKeys = function() {
	return redis.getAllKeys();
}

module.exports.getValue = function(key) {
	return redis.get(key);
}

module.exports.callLuaScript = function() {
	redis.callLuaScript();
}

module.exports.clearKeys = function() {
	redis.getAllKeys().then(keys => {
		console.log('Deleting keys...');
		for (var i = 0, len = keys.length; i < len; i++) {
			redis.delete(keys[i]);
		}
		console.log('keys deleted');
	}).catch(console.log);
}

module.exports.getList = function(key) {
	return new Promise((resolve, reject) => {
		redis.getList(key).then(list => {
			if (list.length === 1 && list[0] === '0') resolve([]);
			else resolve(list);
		}).catch(reject);
	});
}

module.exports.storeList = function(key, list) {
	// return redis.setListEx(key, getNonEmptyList(list));
	return redis.runScript('src/redis/setListEx.lua', 2, key, 120, ...getNonEmptyList(list));
}

module.exports.storeEvents = function(events) {
	events.map(event => redis.setObjectEx(event.event_uid, event));
}

module.exports.storeSingleEvent = function(calendarID, event) {
	const date = new Date(event.start);
	const dates = [];
	this.getList(`${calendarID}:dates`).then(d => dates.push(...d)).catch(() => {return;});
	for (const date2 of dates) {
		if (date.getTime() === date2.getTime()) {
			redis.setList(`${calendarID}:events`, event);
			redis.setObjectEx(event.event_uid, event);
		}
	}
}

module.exports.deleteEvent = function(calendarID, eventID){
	redis.removeFromList(`${calendarID}:events`, eventID);
	redis.delete(eventID);
}

module.exports.updateEvent = function(calendarID, event) {
	this.deleteEvent(calendarID, event.event_uid);
	this.storeSingleEvent(calendarID, event);
}

function getNonEmptyList(values) {
	return (!values || values.length === 0) ? [0] : values;
}