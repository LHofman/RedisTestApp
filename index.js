const express = require('express');
const redis = require('./redis');
const google = require('./providers/google');
const { formatDate } = require('./util');

const calendarID = '4ln5p1mg4t32icgrrphbodi1ho@group.calendar.google.com';
// 4ln5p1mg4t32icgrrphbodi1ho@group.calendar.google.com
// 4ueu53ere2jrp4dtkqicfqutdo
const startDate = new Date(2018, 0, 1);
const endDate = new Date(2018, 2, 1);

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

// redis.getAllKeys().then(keys => console.log('keys: ' + keys));
// redis.clearKeys();
// getCalendars().then(console.log);
// createMultipleEvents(calendarID, summary, startTime, endTime, 1).then(events => displayEvents([events]));
getEventsBetweenDates([calendarID], startDate, endDate).then(displayEventsShort).catch(console.error);
// deleteEvent(calendarID, eventID);
// updateEvent(calendarID, event); //doesn't work

function getEventsBetweenDates(calendars, startDate, endDate = startDate) {
    return new Promise((resolve, reject) => {
        if (!startDate) reject('No dates entered');
        const dates = []
        const newDate = new Date(startDate.getTime());
        while (newDate.getTime() <= endDate.getTime()) {
            dates.push(new Date(newDate.getTime()));
            newDate.setDate(newDate.getDate() + 1);
        }
        const calendarPromises = [];
        //loop over calendars
        for (const calendarID of calendars) {
            calendarPromises.push(new Promise(resolve => {
                //check if calendar in cache
                console.log('checking if calendar is in cache');
                redis.getList(`${calendarID}:dates`).then(dateList => {
                    // calendar in cache
                    console.log('calendar is in cache');
                    const datesNotInCache = [];
                    for (const date of dates) {
                        // console.log('checking if date is in cache');
                        if (dateList.filter(date2 => new Date(date2).getTime() === date.getTime()).length < 1) {
                            datesNotInCache.push(date);
                        }
                    }
                    redis.getList(`${calendarID}:events`).then(events => {
                        const allEvents = [];
                        allEvents.push(...events);
                        if (datesNotInCache.length > 0) {
                            getEventsFromAPI(calendarID, datesNotInCache).then(eventList => {
                                allEvents.push(...eventList);
                                resolve(allEvents);
                            }).catch(console.error);
                        }
                        else resolve(allEvents);
                    });
                }).catch(cause => {
                    // calendar not in cache
                    console.log('calendar not in cache, getting events from API');
                    // get events from API
                    // store events in cache
                    getEventsFromAPI(calendarID, dates).then(resolve).catch(console.error);
                });
            }));
        }
        Promise.all(calendarPromises).then((events) => {
            const allEvents = [];
            events.map(eventList => allEvents.push(...eventList));
            resolve(allEvents);
        });
    });
}

function getEventsFromAPI(calendarID, dates) {
    return new Promise(resolve => {
        //get events from external API
        google.listEvents(calendarID, new Date(startDate), new Date(endDate)).then(events => {
            //store list of dates in cache
            redis.storeList(`${calendarID}:dates`, dates);
            //store list of eventIDs
            const eventIDs = [];
            events.map(event => eventIDs.push(event.event_uid));
            redis.storeList(`${calendarID}:events`, eventIDs);
            //store events in cache
            redis.storeEvents(events);
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
