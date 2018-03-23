const express = require('express');
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const util = require('../../util');

var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

module.exports.getAuthorized = function () {
    return new Promise((resolve) => {
        readFile()
            .then(content => authorize(JSON.parse(content)))
            .then(resolve);
    });
}

function readFile() {
    return new Promise((resolve) => {
        //Load client secrets from a local file
        // console.log('Reading file...');
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            //auhtorize a client with the loaded credentials, then call the google calendar api
            resolve(content);
        });
    });
}
/**
 * Create a OAuth2 client with the given credentials, and then execute the given callback function
 */
function authorize(credentials) {
    return new Promise((resolve) => {
        // console.log('Authorizing user...');
        const installed = credentials.google;
        var clientSecret = installed.client_secret;
        var clientId = installed.client_id;
        var redirectUrl = installed.redirect_uris[0];
        var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

        //Check if we have previously stored a token
        fs.readFile(TOKEN_PATH, function (err, token) {
            //getNewToken(oauth2Client, callback);
            if (err) {
                resolve(getNewToken(oauth2Client));
            } else {
                oauth2Client.credentials = JSON.parse(token);
                resolve(oauth2Client);
            }
        });
    });
}

/**
 * Get and store new token after prompting for user authorization and then execute the given callback with the authorized OAuth2 client
 */
function getNewToken(oauth2Client) {
    return new Promise((resolve) => {
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
        console.log('Authorize this app by visiting this url: ', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the code from that page here: ', function (code) {
            rl.close();
            oauth2Client.getToken(code, function (err, token) {
                if (err) {
                    console.log('Error while trying to retrieve access token', err);
                    return;
                }
                oauth2Client.credentials = token;
                storeToken(token);
                resolve(oauth2Client);
            });
        });
    });
}

/**
 * Store token to disk be used in late rprogram executions
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the next events on the user's primary calendar
 */
module.exports.listEvents = function (auth, calendarID, startDate, endDate=startDate) {
    const maxTime = endDate;
    if (endDate.getTime() === startDate.getTime()) maxTime.setDate(maxTime.getDate()+1);
    return new Promise((resolve) => {
        // console.log('Getting events...');
        var calendar = google.calendar('v3');
        calendar.events.list({
            auth: auth,
            calendarId: calendarID,
            singleEvents: true,
            timeMin: startDate.toISOString(),
            timeMax: maxTime.toISOString(),
            orderBy: 'startTime',
            maxResults: 2500
        }, function (err, response) {
            if (err) {
                resolve([]);
                return;
            }
            resolve(response.data.items);
        });
    });
}

module.exports.listCalendars = function (auth) {
    return new Promise(resolve => {
        const calendar = google.calendar('v3');
        calendar.calendarList.list({
            auth: auth
        }, (err, response) => {
            if (err) {
                resolve([]);
                return;
            }
            resolve(response.data.items);
        });
    });
}

module.exports.createEvent = function (auth, summary, startTime, endTime, calendarID = 'primary') {
    return new Promise(resolve => {
        const event = {
            'summary': summary,
            'start': {
                'dateTime': startTime.toISOString(),
                'timeZone': util.timezone,
            },
            'end': {
                'dateTime': endTime.toISOString(),
                'timeZone': util.timezone,
            },
        };

        const calendar = google.calendar('v3');
        calendar.events.insert({
            auth: auth,
            calendarId: calendarID,
            resource: event,
        }, function (err, event) {
            if (err) {
                console.log('There was an error contacting the Calendar service: ' + err);
                return;
            }
            resolve(event.data);
        });
    });
}

module.exports.deleteEvent = function(auth, calendarID='primary', eventID) {
    const calendar = google.calendar('v3');
    calendar.events.delete({
        auth: auth,
        calendarId: calendarID,
        eventId: eventID
    });
}

module.exports.updateEvent = function(auth, calendarID='primary', event) {
    const calendar = google.calendar('v3');
    const event_API = {
        'summary': event.summary,
        'start': {
            'dateTime': new Date(event.start).toISOString(),
            'timeZone': util.timezone,
        },
        'end': {
            'dateTime': new Date(event.end).toISOString(),
            'timeZone': util.timezone,
        },
    };
    calendar.events.update({
        auth: auth,
        calendarId: calendarID,
        eventId: event.event_uid,
        resource: event_API
    })
}
