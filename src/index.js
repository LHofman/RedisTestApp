const express = require('express');
const dateformat = require('dateformat');

const redis = require('./redis');
const google = require('./providers/google');
const { getStartOfDate } = require('./util');

const calendarID = '4ln5p1mg4t32icgrrphbodi1ho@group.calendar.google.com';
// 4ln5p1mg4t32icgrrphbodi1ho@group.calendar.google.com
// 4ueu53ere2jrp4dtkqicfqutdo
const startDate = new Date(2018, 0, 1);
const endDate = new Date(2018, 0, 6);

const summary = 'TestEvent';
const startTime = new Date(2018, 2, 1, 17);
const endTime = new Date(2018, 2, 1, 19);

const eventID = 'iji97k83jrdl0hecv68i6p8ta4';
const event = {
    'event_uid': eventID,
    'summary': summary,
    'start': startTime,
    'end': endTime
}
// console.log(redis.ttl('4ln5p1mg4t32icgrrphbodi1ho@group.calendar.google.com:Thu Mar 01 2018'));
// redis.getAllKeys().then(keys => console.log('keys: ' + keys));
// redis.getValue('myKey1').then(console.log);
// redis.clearKeys();
// redis.getList('4ln5p1mg4t32icgrrphbodi1ho@group.calendar.google.com:Thu Mar 01 2018').then(console.log);
// getCalendars().then(console.log);
// createMultipleEvents(calendarID, summary, startTime, endTime, 1).then(events => displayEvents([events]));
getEventsBetweenDates([calendarID], startDate, endDate).then(displayEventsShort).then(() => printNow()).catch(console.error);
// deleteEvent(calendarID, eventID);
// updateEvent(calendarID, event); //doesn't work
// redis.callLuaScript();
// getEventsFromAPI(calendarID, startDate, endDate);

function getEventsBetweenDates(calendars, startDate, endDate = startDate) {
    printNow();
    return new Promise((resolve, reject) => {
        if (!startDate) reject('No dates entered');
        const dates = []
        const newDate = new Date(startDate.getTime());
        while (newDate.getTime() <= endDate.getTime()) {
            dates.push(new Date(newDate.getTime()));
            newDate.setDate(newDate.getDate() + 1);
        }
        //loop over calendars
        const calendarPromises = [];
        for (const calendarID of calendars) {
            calendarPromises.push(new Promise((resolve, reject) => {
                //loop over dates
                const datePromises = [];
                for (const date of dates) {
                    datePromises.push(redis.getList(`${calendarID}:${date.toDateString()}`))
                }
                Promise.all(datePromises).then((events) => {
                    console.log('found calendar in cache');
                    const allEvents = [];
                    events.map(eventList => eventList.map(event => allEvents.push(JSON.parse(event))));
                    resolve(allEvents);
                }).catch(reason => {
                    if (reason != 'KEY_NOT_FOUND') reject(reason);
                    console.log('calendar not in cache, getting events from API');
                    getEventsFromAPI(calendarID, startDate, endDate).then(resolve);
                });
            }));
        }
        Promise.all(calendarPromises).then((events) => {
            const allEvents = [];
            events.map(eventList => allEvents.push(...eventList));
            //remove duplicate events (multiple day events)
            const eventIDs = [];
            const distinctEvents = [];
            allEvents.map(event => {
                if (eventIDs.indexOf(event.event_uid) === -1) {
                    eventIDs.push(event.event_uid);
                    distinctEvents.push(event);
                }
            });
            
            resolve(distinctEvents);
        }).catch(reject);
    });
}

function getEventsFromAPI(calendarID, startDate, endDate) {
    return new Promise(resolve => {
        //get events from external API
        google.listEvents(calendarID, new Date(startDate), new Date(endDate)).then(events => {
            //store list of events
            const eventsMap = new Map();
            const date = new Date(startDate.getTime());
            do {
                eventsMap.set(date.toDateString(), []);
                date.setDate(date.getDate() + 1);
            } while (date.getTime() <= endDate.getTime());
            events.map(event => {
                const endDate = getStartOfDate(event.end);
                const eventDate = getStartOfDate(event.start);
                do {
                    eventsMap.get(eventDate.toDateString()).push(JSON.stringify(event));
                    eventDate.setDate(eventDate.getDate() + 1);
                } while (eventDate.getTime() <= endDate.getTime());
            });
            for (let [key, value] of eventsMap) {
                redis.storeList(`${calendarID}:${key}`, value);
            }
            resolve(events);
        });
    });
}

function createMultipleEvents(calendarID, summary, startTime, endTime, amount) {
    return new Promise(resolve => {
        const promises = [];
        for (let index = 1; index <= amount; index++)
            promises.push(createEvent(calendarID, summary, startTime, endTime));
        Promise.all(promises).then(events => {
            resolve(...events);
        })
    })
}

function createEvent(calendarID, summary, startTime, endTime) {
    return new Promise(resolve => {
        google.createEvent(calendarID, summary, startTime, endTime).then(event => {
            redis.storeSingleEvent(calendarID, event);
            resolve(event);
        });
    });
}

function deleteEvent(calendarID, eventID) {
    redis.deleteEvent(calendarID, eventID);
    google.deleteEvent(calendarID, eventID);
}

function updateEvent(calendarID, event) {
    redis.updateEvent(calendarID, event);
    google.updateEvent(calendarID, event);
}

function getCalendars() {
    return google.listCalendars();
}

function displayEvents(events) {
    console.log("displaying events");
    if (events.length === 0) console.log('No events planned.\n');
    events.map(event => {
        console.log(`calendar_id: ${event.calendar_id}`);
        console.log(`event_uid: ${event.event_uid}`);
        console.log(`description: ${event.description}`);
        console.log(`start: ${event.start.toDateString()} ${event.start.toTimeString()}`);
        console.log(`end: ${event.end.toDateString()} ${event.end.toTimeString()}`);
        console.log(`is_full_day: ${event.is_full_day}`);
        console.log(`availability: ${event.availability}`);
        console.log(`private: ${event.private}`);
        console.log(`appointment_id: ${event.appointment_id}`);
        console.log(`appointment_possibility_id: ${event.appointmnt_possibility_id}`);
        console.log();
    });
}

function displayEventsShort(events) {
    console.log(`found ${events.length} events`);
}

function printNow() {
    const now = new Date();
    console.log(dateformat(now, `HH:m:ss:${now.getMilliseconds()}`));
  }
  