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
 *  This file is a JavaScript entry point to the authentication and nowPlaying API features of Last.Fm.
 *	Note that we do not provide a way to actually scrobble the track.
 *	This is intended behaviour as this extension is made to add the Last.Fm nowplaying support to HypeMachine,
 *	and HypeMachine does the scrobbling.
 *  
 *  The main functions are authorize and updateNowPlaying.
 *
 *  NOTES:
 *  - I assume jQuery.ajax uses jQuery.param to encodeURIComponent the parameters,
 *  	but I'm not sure how I should do it in my api_sig.
 *  	It seems to work though (tested also with korean text and '&'), but it might be a good first place to look if bugs pop up.
 *
 */

// namespaces
LastFm =  {};
LastFm.Auth = {};
LastFm.Storage = {};

LastFm.listeners = {};
LastFm.newId = 0;
LastFm.singleListener = null;

// LastFm API settings
LastFm.apiUrl = 'http://ws.audioscrobbler.com/2.0/';
LastFm.authUrl = 'http://www.last.fm/api/auth/';
LastFm.apiKey = '5c53c0eaa8f961d8925655abd3fcc596';

LastFm.session = null;
LastFm.user = null;

LastFm.Storage.sessionKey = 'session';
LastFm.Storage.userKey = 'user';
LastFm.Storage.tokenKey = 'token';
LastFm.Storage.tokenExpiresKey = 'tokenExpires';

/**
 *	Notify all listeners of the given connection state.
 *	@param connected whether we have a session for connecting to Last.fm.
 */
LastFm.notifyListeners = function(connected) {
	$.each(LastFm.listeners, function(handle, listener) {listener(connected);});
	if (LastFm.singleListener) {
		LastFm.singleListener(connected);
	}
};

/**
 *	Add a listener which should be called when the authorization state changes.
 *	@param listener the function which should be called with the current state.
 *	It will be called with a boolean which will be true iff we have a session.
 *	@return a handle, which can be used to remove the listener.
 */
LastFm.addListener = function(listener) {
	var handle = LastFm.newId++;
	LastFm.listeners[handle] = listener;
	console.log('added, listeners: ', LastFm.listeners);
	return handle;
};

/**
 *	Remove the listener with the given handle.
 *	@param handle the handle as supplied to you by the addListener call.
 */
LastFm.removeListener = function(handle) {
	delete LastFm.listeners[handle];
};

/**
 *	Override the current single listener.
 *	This single listener is just another listener,
 *	but as I have no clue how to register a close function for the popup,
 *	there is no way to properly remove the popup's listeners.
 */
LastFm.setListener = function(listener) {
	LastFm.singleListener = listener;
};

/**
 *	Removes all data about the connection to Last.fm
 *	@param callback OPTIONAL, will be called when all data is cleared and all listeners notified.
 */
LastFm.disconnect = function(callback) {
	LastFm.session = null;
	LastFm.user = null;
	chrome.storage.local.clear(function() {
		LastFm.notifyListeners(false);
		if (callback) callback();
	});
};

/**
 *	Checks if we have a session.
 *	@param callback1 a callback(success) which will be called with true iff we have a session.
 */
LastFm.Auth.isAuthorized = function(callback1) {
	callback1(LastFm.session != null);
};

/**
 *	Tries to get the Last.fm session.
 *	If we are not yet authorized, we try to obtain a token and ask the user to authorize us.
 *
 *	@param callback1 OPTIONAL, callback function with 1 argument.
 *	The argument is true if we successfully got a session, false otherwise.
 *	Note that you might want to retry after a while if you get false,
 *	because the user might have asynchronously authorized us in the meantime.
 */
LastFm.Auth.authorize = function(callback1) {
	if (LastFm.session) {
		callback(true);
		return;
	}
	
	var sessionKey = LastFm.Storage.sessionKey;
	var userKey = LastFm.Storage.userKey;
	var tokenKey = LastFm.Storage.tokenKey;
	var tokenExpiresKey = LastFm.Storage.tokenExpiresKey;
	chrome.storage.local.get(
		[sessionKey, userKey, tokenKey, tokenExpiresKey],
		function(data){
			if (data && data[sessionKey] && data[sessionKey] != '') {
				// user already authorized
				LastFm.session = data[sessionKey];
				LastFm.user = data[userKey] ? data[userKey] : null;
				LastFm.notifyListeners(true);
				if(callback1) callback1(true);
			} else if (data && data[tokenKey] && data[tokenExpiresKey] && $.now() < data[tokenExpiresKey]) {
				// we have a token, but haven't tried to trade it for a session yet
				LastFm.Auth.getSession(
					data[tokenKey],
					function(session) {
						if (session && session.key && session.name) {
							LastFm.user = session.name;
							LastFm.session = session.key;
							chrome.storage.local.remove([tokenKey, tokenExpiresKey]);
							var toStore = {};
							toStore[sessionKey] = session.key;
							toStore[userKey] = session.name;
							chrome.storage.local.set(toStore);
							LastFm.notifyListeners(true);
							if(callback1) callback1(true);
						}
					},
					function (xhr, status, error) {
						if (status == 4 || status == 15) {
							// invalid or expired token
							chrome.storage.local.remove([tokenKey, tokenExpiresKey]);
						} else if (status == 14) {
							// unauthorized token, ask for authorization again
							window.open(Last.Fm.authUrl+"?api_key="+Last.Fm.apiKey+'&token='+data[tokenKey]);
						}
						if(callback1) callback1(false);
					}
				);
			} else {
				// no authorization steps performed yet, or an expired token
				if (data[tokenKey]) {
					// remove old token
					chrome.storage.local.remove([tokenKey, tokenExpiresKey]);
				}
				// time to get a token
				LastFm.Auth.getToken(
					function(token) {
						var toStore = {};
						toStore[tokenKey] = token;
						// it is valid for 60 minutes, but let's be safe an make it 50
						toStore[tokenExpiresKey] = $.now() + (50 * 60000);
						chrome.storage.local.set(toStore);
						// ask for authorization
						window.open(LastFm.authUrl+"?api_key="+LastFm.apiKey+'&token='+token);
						// not authorized yet, make user redo the action that required authorization
						if(callback1) callback1(false);
					},
					function (xhr, status, error) {
						if(callback1) callback1(false);
					}
				);
			}
		}
	);
};

/**
 *  Updates the current playing track to Last.fm (does not require scrobbling).
 *  @param track the name of the current track.
 *  @param artist the name of the artist performing the track.
 *  @param duration the duration of the track in second.
 *  Note that this is REQUIRED for Last.fm to update their user.recentTracks data.
 *  @param callback1 OPTIONAL, a callback with 1 argument.
 *	It will be called with true if the update was successful, and false otherwise.
 *	Note that false might indicate that the session expired.
 *	If so, we already disconnected from Last.fm.
 */
LastFm.updateNowPlaying = function(track, artist, duration, callback1) {
	if (LastFm.session) {
		var params = {
			method : 'track.updateNowPlaying',
			format : 'json',
			artist : artist,
			track : track,
			duration : duration,
			api_key : LastFm.apiKey,
			sk : LastFm.session
		};
		var sig = LastFm.getSig(params);
		
		LastFm.doApiCall(
			$.extend(params, {api_sig : sig}),
			function(response, status, xhr) {
				if (window && window.console)console.log("Successfully updated nowplaying: ", response);
				if (callback1) callback1(true);
			},
			function(xhr, status, error){
				if (window && window.console)consle.log("Failed to update nowplaying with status %s: ", status, error);
				if (status == 9) {
					// we have to reauthenticate
					LastFm.disconnect()
				}
				if (callback1) callback1(false);
			},
			'POST'
		);
	}
};

/**
 *  Gets the api_sig as specified by the Last.fm API.
 *  @param params the parameters (key/value pairs) for the call you want to make (without the api_sig parameter).
 *  @return the signature as required for these parameters and our API account.
 */
LastFm.getSig = function(params) {
	var names = [];
	var sig = "";
	// for some reason, the 'format' parameter shouldn't be in the signature
	$.each(params, function(name){if (name != "format") {names.push(name);}});
	names.sort();
	for (var i = 0; i < names.length; i++) {
		sig = sig + names[i] + params[names[i]];
	}
	sig = sig + 'aab4544113738cfef1ee5881c08c9f7e';
	return MD5(sig);
};

/**
 *  Gets an unauthorized token from the Last.fm api.
 *  @param callback1 a callback for success, with 1 parameter: the token.
 *  @param error3 a callback for failure, with 3 parameters:
 *  - the request	: the jQuery xhr request
 *  - a status		: either a jQuery status message or a Last.fm error code
 *	- error message	: might not be supplied, depending on the error
 */
LastFm.Auth.getToken = function(callback1, error3) {
	var params = {
		method : 'auth.getToken',
		format : 'json',
		api_key : LastFm.apiKey
	};
	var sig = LastFm.getSig(params);
	var data = $.extend(params, {api_sig : sig});
	LastFm.doApiCall(
		data,
		function(response, status, xhr) {
			if (window && window.console)console.log("Token provided with status %s and response:", status, response);
			callback1(response.token);
		}, 
		function(xhr, status, error) {
			if (window && window.console)console.log("Failed to get token with status %s and error:", status, error);
			if (error3) {
				error3(xhr, status, error);
			}
		}
	);
};

/**
 *  Gets the Last.fm session from the Last.fm API for the given token.
 *  @param token the unauthorized token.
 *  @param callback1 a success callback, with 1 parameter: the session object.
 *  {key, name}
 *  @param error3 an error callback, with 3 parameters:
 *  - the request	: the jQuery xhr request
 *  - a status		: either a jQuery status message or a Last.fm error code
 *  - error message	: might not be supplied, depending on the error
 */
LastFm.Auth.getSession = function(token, callback1, error3) {
	var params = {
		method : 'auth.getSession',
		format : 'json',
		api_key : LastFm.apiKey,
		token : token
	};
	var sig = LastFm.getSig(params);
	LastFm.doApiCall(
		$.extend(params, {api_sig : sig}),
		function(response, status, xhr) {
			if (window && window.console)console.log("Session provided with status %s:", status);
			callback1(response.session);
		}, 
		function(xhr, status, error) {
			if (window && window.console)console.log("Failed to get session with status %s and error:", status, error);
			if (error3) {
				error3(xhr, status, error);
			}
		}
	);
};

/**
 *  Performs the API call as specified by the parameters.
 *  @param params the Last.fm API call parameters. Should include 'method' and 'api_sig' if required.
 *  @param callcak3 the success callback for the jQuery.ajax call.
 *  @param error3 the error callback for the jQuery.ajax call.
 *  Note that the status and error message (parameters 2 and 3) might be the Last.fm error code and message respectively.
 */
LastFm.doApiCall = function(params, callback3, error3, method) {
	$.ajax(
		LastFm.apiUrl,
		{
			// apparently jquery adds a '_' parameter to the request when cache=false
			// we don't want to cache, but Last.fm also can't handle the _ parameter
			cache	: true,
			data	: params,
			dataType: 'json',
			error	: error3,
			success	: function(response, status, xhr) {
				if (response && response.error) {
					error3(xhr, response.error, response.message);
				} else {
					callback3(response, status, xhr);
				}
			},
			type	: (method ? method : 'GET')
		}
	);
};

// when our extension is loaded, read the session (if any) from storage.
chrome.storage.local.get(
	[LastFm.Storage.sessionKey, LastFm.Storage.userKey],
	function(data) {
		if (data && data[LastFm.Storage.sessionKey]) {
			LastFm.session = data[LastFm.Storage.sessionKey];
			if (data[LastFm.Storage.userKey]) {
				LastFm.user = data[LastFm.Storage.userKey];
			}
			LastFm.notifyListeners(true);
		}
	}
);