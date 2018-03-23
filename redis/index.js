const redis = require('./redis');

module.exports.getAllKeys = function() {
	return redis.getAllKeys();
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
	return redis.getList(key);
}

module.exports.storeList = function(key, list) {
	return redis.setListEx(key, list);
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