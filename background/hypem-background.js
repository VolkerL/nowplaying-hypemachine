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
 *  This script keeps track of the last track played on HypeMachine.
 *  It asks all tabs with HypeMachine open to send new track info when we register a call to hypem.com/serve
 *
 *	Furthermore, the last track may be updated asynchronously at any time by a 'newTrack' message.
 */
 
// namespaces
HypemController = {};

HypemController.listeners = {};
HypemController.newId = 0;
HypemController.singleListener = null;
HypemController.lastTrack = {
	track : null,
	// time of last update of this variable in seconds
	playedAt : null
};
 
/**
 *  Asks the content script(s) running on hypem.com to send us track info if a track is currently playing.
 *	
 *	Note that this just sends a 'getCurrentTrack' message, and does not use the callback system.
 */
HypemController.requestTrackInfo = function() {
	chrome.tabs.query(
		{url: "*://hypem.com/*"},
		function(tabs) {
			for (var i = 0; i < tabs.length; i++) {
				chrome.tabs.sendMessage(
					tabs[i].id,
					'getCurrentTrack'
				);
			}
		}
	);
};

/**
 *	Calls all registered listener functions with the given track as argument.
 *	@param track the track which should be passed to each listener.
 */
HypemController.notifyListeners = function(track) {
	$.each(HypemController.listeners, function(index, listener) {
		listener(track);
	})
	if (HypemController.singleListener) {
		HypemController.singleListener(track);
	}
};

/**
 *	Registers the given listener, which will be called when we get info on a playing track.
 *  Note that you can be notified multiple times for the same track.
 *	As you are notified whenever the HypeMachine play button is pressed and playing,
 *	as well as whenever a content-script responds to requestTrackInfo.
 *	@param listener1 the listener function with 1 argument. It will be passed the new track:
 *	{artist : String, track : String, duration : int}
 *	@return the handle, which can be used to remove the listener.
 */
HypemController.addListener = function(listener1) {
	var handle = HypemController.newId++;
	HypemController.listeners[handle] = listener1;
	return handle;
};

/**
 *	Unregisters the listener at the given handle.
 *	@param handle the handle as returned by addListener.
 */
HypemController.removeListener = function(handle) {
	delete HypeController.listener[handle];
};

/**
 *	Override the current single listener.
 *	This single listener is just another listener,
 *	but as I have no clue how to register a close function for the popup,
 *	there is no way to properly remove the popup's listeners.
 */
HypemController.setListener = function(listener) {
	HypemController.singleListener = listener;
};

// listen for track updates from any tab
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if (request && request.method == 'newTrack') {
			var track = request.track;
			if (track && track.artist && track.track && track.duration) {				
				HypemController.notifyListeners(track);
			}
		}
	}
);

// on hypem.com/serve request, request all tabs to send any new track info they have
chrome.webRequest.onCompleted.addListener(
	function(details) {
		HypemController.requestTrackInfo();
	},
	{urls : ["*://hypem.com/serve/*"]},
	[]
);