/*	
	This file is part of NowPlaying - HypeMachine, a chrome extension to
	register the track currently playing on HypeMachine as nowplaying
	track on Last.fm.
    Copyright (C) 2014  Volker Lanting

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
 *  This file contains javascript code which tracks the playing state of music.
 *  It will be injected as content script according to the manifest settings.
 *	Note that this requires a reload of such pages if they were loaded before the extension was installed.
 */
 
 // get the current state
 // track info is requested asynchronously to get full song info
 // upon failure it is obtained directly from the player,
 // which may result in shortened track titles (e.g. "Some super long trackn...")
function getState(callback1) {
	getTrackInfo(function(track){
		if (track && track.track && track.artist && track.duration) {
			callback1({
				playing : getPlayState(),
				artist : track.artist,
				track : track.track,
				duration : track.duration
			});
		} else {
			callback1({
				playing : getPlayState(),
				artist : getArtist(),
				track : getTrackName(),
				duration : getDuration()
			});
		}
	});
}

// gets the (full) track info from HypeMachine's JSON API.
// based on the track link in the player box.
function getTrackInfo(callback1) {
	var rawLink = $('div#player-controls').children('div#player-nowplaying').children('a')[1];
	if (rawLink) {
		$.ajax(
			'http://hypem.com/playlist'+$(rawLink).attr('href')+'/json/data.js',
			{
				dataType : 'json',
				success : function(response, status, xhr) {
					var trackInfo = null;
					if (response && response["0"]) {
						trackInfo = response["0"];
					}
					if (trackInfo && trackInfo.title && trackInfo.artist && trackInfo.time) {
						callback1({track: trackInfo.title, artist: trackInfo.artist, duration: trackInfo.time})
					} else {
						callback1(null);
					}
					
				},
				error : function(xhr, status, error) {
					if (window && window.console) console.log("Failed to get detailed track info with status % status and error: ", error);
					callback1(null);
				}
			}
		)
	} else {
		callback1(null);
	}
}

// returns true if the player is playing
function getPlayState() {
	var playButton = $('div#player-controls').children('a#playerPlay');
	return (playButton[0] != null && $(playButton[0]).hasClass('pause'));
}

function getTrackName() {
	var nameElem = $('div#player-controls').children('div#player-nowplaying').children('a');
	return nameElem[1] != null ? $(nameElem[1]).text() : null;
}

function getArtist() {
	var nameElem = $('div#player-controls').children('div#player-nowplaying').children('a');
	return nameElem[0] != null ? $(nameElem[0]).text() : null;
}

function getDuration() {
	var totalTime = $('div#player-controls').children('div#player-timebar').children('div#player-time-total');
	return totalTime[0] != null ? parseToSeconds($(totalTime[0]).text()) : null;
}

// parses hours:minutes:seconds or minutes:seconds or seconds to seconds
function parseToSeconds(time) {
	var times = time.split(':');
	if (times.length == 1) {
		return parseInt(times[0]);
	} else if (times.length == 2) {
		return parseInt(times[1]) + (60 * parseInt(times[0]));
	} else if (times.length == 3) {
		return parseInt(times[2]) + (60 * parseInt(times[1])) + (3600 * parseInt(times[0]))
	} else {
		return null;
	}
	
}

function getAndSendTrack() {
	getState(function(state) {
		if (state && state.playing && state.artist && state.track && state.duration) {
			// asynchronous response, as any tab might respond and leaving this function
			// invalidates the shared sendResponse callback for all tabs
			chrome.runtime.sendMessage(
				{
					method : 'newTrack',
					track : {
						artist : state.artist,
						track : state.track,
						duration : state.duration
					}
				},
				function(response) {}
			);
		}
	});
}

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if (request == 'getCurrentTrack') {
			getAndSendTrack();
		}
	}
);

// notify listeners if the song is unpaused
$('div#player-controls').children('a#playerPlay').click(getAndSendTrack);