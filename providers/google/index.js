const google = require('./google');

module.exports.listEvents = function (calendarID, startTime, endTime = startTime) {
    return new Promise((resolve, reject) => {
        if (!startTime) reject('No dates entered');
        console.log('getting authorization');
        google.getAuthorized()
            .then(auth => google.listEvents(auth, calendarID, startTime, endTime))
            .then(events => {
                const eventObjects = [];
                events.map(event => {
                    eventObjects.push(formatEvent(event, calendarID));
                });
                resolve(eventObjects);
                return;
            });
    });
}

module.exports.listCalendars = function () {
    return new Promise((resolve) => {
        google.getAuthorized().then(google.listCalendars).then(resolve);
    });
}

module.exports.createEvent = function (calendarID, summary, startTime, endTime) {
    return new Promise(resolve => {
        google.getAuthorized().then(auth => google.createEvent(auth,  summary, startTime, endTime, calendarID))
            .then(event => resolve(formatEvent(event, calendarID)));
    });
}

module.exports.deleteEvent = function(calendarID, eventID) {
    google.getAuthorized().then(auth => google.deleteEvent(auth, calendarID, eventID));
}

module.exports.updateEvent = function(calendarID, event) {
    google.getAuthorized().then(auth => google.updateEvent(auth, calendarID, event));
}

function formatEvent(event, calendarID = 'primary') {
    const is_full_day = event.start.dateTime === undefined
    return {
        'calendar_id': calendarID,
        'event_uid': event.id,
        'description': event.summary,
        'start': new Date(event.start.dateTime || event.start.date),
        'end': new Date(event.end.dateTime || event.end.date),
        'is_full_day': is_full_day,
        'availability': event.transparency === 'transparent' ? 'free' : 'busy',
        'private': event.visibility === 'private' || event.visibility === 'confidential',
        'appointment_id': (((event.extendedProperties || {}).shared || {}).skedify_appointment_id) || 0,
        'appointment_possibility_id': (((event.extendedProperties || {}).shared || {}).skedify_possibility_id) || 0,
    }
}