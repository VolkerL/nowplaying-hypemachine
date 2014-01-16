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
var runningState = {
	running : false,
	offIcon : {"19" : "images/offIcon19.png", "38" : "images/offIcon38.png"},
	onIcon : {"19" : "images/onIcon19.png", "38" : "images/onIcon38.png"},
	lastTracked : null,
	lastTrackedAt : null,
	lastSent : null,
	lastSentAt : null
};

function updateRunningState(running) {
	if (running != runningState.running) {
		runningState.running = running;
		chrome.browserAction.setIcon({path : (running ? runningState.onIcon : runningState.offIcon)});
		if (running) {
			// sent the current track if it wasn't sent
			HypemController.requestTrackInfo();
		}
	}
}

function isRunning() {
	return runningState.running;
}

// returns true if the lastTracked track should be send to Last.fm
function requiresUpdate() {
	var track = runningState.lastTracked;
	var trackTime = runningState.lastTrackedAt;
	var old = runningState.lastSent;
	var oldTime = runningState.lastSentAt;
	var result;
	if (old && old.track == track.track && old.artist == track.artist && old.duration == track.duration) {
		// If the track is the same:
		// If the track was paused for a long time so the duration has passed,
		// we need to re-update to Last.fm.
		// Otherwise we can just ignore it
		result = (oldTime + old.duration) < parseInt($.now() / 1000);
	} else {
		// If the track is not the same, we need to update
		result = true;
	}
	return result;
}

$(function() {
	// update to Last.fm if we are running and connected to Last.fm
	HypemController.addListener(function(track) {
		runningState.lastTracked = track;
		runningState.lastTrackedAt = parseInt($.now() / 1000);
		LastFm.Auth.isAuthorized(function(authorized) {
			if (isRunning() && authorized && requiresUpdate()) {
				LastFm.updateNowPlaying(
					track.track,
					track.artist,
					track.duration
				);
				runningState.lastSent = track;
				runningState.lastSentAt = parseInt($.now() / 1000);
			}
		});
	});
});