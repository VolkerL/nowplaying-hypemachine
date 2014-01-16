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

$(function(){
	var bg = chrome.extension.getBackgroundPage();

	//  .--------------------------.
	// | about box and license info |
	//  '--------------------------'
	// used to toggle between showing about info and license info
	var showLicense = false;
	// update what info is shown in the about box: about info or license
	function updateAboutBox() {
		if (showLicense) {
			$('#license').show();
			$('#about').hide();
			$('#licenseBtn').text('Show about');
		} else {
			$('#license').hide();
			$('#about').show();
			$('#licenseBtn').text('Show license');
		}
	}
	// update which of the panels is shown: the about box or the normal content
	function showAboutBox(show) {
		if (show) {
			$('div.content').hide();
			$('div.aboutbox').show();
			$('#aboutBtn').text('back');
			updateAboutBox();
		} else {
			$('div.content').show();
			$('div.aboutbox').hide();
			$('#aboutBtn').text('about');
		}
	}
	// allow switching between license and about info with a button
	$('#licenseBtn').click(function() {
		showLicense = !showLicense;
		updateAboutBox();
	});
	// hide the about box by default
	$('div.aboutbox').hide();
	// toggle the about box with the about button
	$('#aboutBtn').click(function() {
		showAboutBox($('div.aboutbox').css('display') == 'none');
	});
	
	
	//  .---------------------.
	// | connecting to Last.fm |
	//  '---------------------'
	var connected = false;
	function updateLastFmState(con) {
		connected = con;
		if (connected) {
			$('span#status').text("Connected");
			$('a#connectBtn').text("Disconnect");
		} else {
			$('span#status').text("Not Connected");
			$('a#connectBtn').text("Connect to Last.fm");
		}
	}
	// listen to future changes in authorization state
	bg.LastFm.setListener(function(connected) {
		updateLastFmState(connected);
	});
	// respond to current authorization state
	bg.LastFm.Auth.isAuthorized(function(connected) {
		updateLastFmState(connected);
	});
	// allow toggling of authorization state
	$('#connectBtn').click(function() {
		if (connected) {
			bg.LastFm.disconnect();
		} else {
			bg.LastFm.Auth.authorize();
		}
	});
	
	//  .--------------------.
	// | current song updates |
	//  '--------------------'
	function updateTrackInfo(track) {
		if (track && track.track && track.artist) {
			$('span#currSong').text(track.track);
			$('span#currArtist').text('by ' + track.artist);
		}
	}
	// listen for changes
	bg.HypemController.setListener(updateTrackInfo);
	// get the inital value
	updateTrackInfo(bg.runningState.lastTracked);
	
	//  .----------------------.
	// | managing running state |
	//  '----------------------'
	function updateRunningState(running) {
		bg.updateRunningState(running);
		if (running) {
			$('#scrobbleBtn').css({'background-image' : 'url(\'../images/on.png\')'});
			$('#runningStatus').text('Running');
		} else {
			$('#scrobbleBtn').css({'background-image' : 'url(\'../images/off.png\')'});
			$('#runningStatus').text('Not Running');
		}
	}
	// update UI based on the current state
	updateRunningState(bg.isRunning());
	// let the user toggle the running state
	$('#scrobbleBtn').click(function() {
		if (!bg.isRunning() && !connected) {
			alert("Please connect to Last.fm first");
			return;
		}
		updateRunningState(!bg.isRunning());
	});
});