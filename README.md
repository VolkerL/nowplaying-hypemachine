# NowPlaying - HypeMachine

NowPlaying - HypeMachine is a Chrome browser extension that can tell [Last.fm](http://last.fm) what you are currently listening to on [HypeMachine](http://hypem.com).

HypeMachine already scrobbles your tracks to your Last.fm profile after they have been playing for a while,
but that is only half of the actual scrobbling process.
This Chrome extension will do the other half.
It notifies Last.fm about which track is currently playing.

Using NowPlaying - Hypemachine and HypeMachine's native scrobbling feature together will result in a proper scrobbling process.
This means that you can now use an application like [NowPlaying](http://github.com/volkerl/releases)
when listening to your tracks on HypeMachine.

## Usage

The extension can be downloaded from the Chrome Web Store by clicking [here](https://chrome.google.com/webstore/detail/nowplaying-hypemachine/dadplfmhpmchkhbhanoeaeagojlpafab).

After installing it, an icon will appear in the right upper corner of your browser window.
If the icon is red, it means the extension is currently not updating your track info to Last.fm.
A green icon will indicate that the extension is active, and will update your track info to Last.fm.

If you click on the icon, a popup will appear.
This is the main window of the application.

First you should connect to Last.fm, otherwise we can not update your track info.
You can do this by clicking the black 'connect' button.
A browser tab will open and send you to Last.fm where you can authorize this application.
To check if you are authorizing the proper application, make sure it sais VolkerLastFm.
After this is completed, you can open the popup again.
You might have to press 'connect' again, but this time it should immediately connect and change the button to 'disconnect'.

Now that we are connected to Last.fm we can upload your track info to Last.fm.
To start this process click the big red button at the bottom of the popup.
If it turns green the application is started.

The final step is to start listening.
Navigate to [HypeMachine](http://hypem.com) and start listening.
Your track information should now be uploaded to Last.fm.
To see if it is registering your track, open the popup and check if the correct information is shown in the 'Latest Song' section in the middle of the popup.
If you already had a tab open with HypeMachine before you installed the extension, please refresh the page.
Otherwise the extension won't be able to see your current track.

If it is not registering your tracks and you already refreshed the HypeMachine page,
please create an issue on the [Github page](https://github.com/volkerl/nowplaying-hypemachine/issues) so I can try to help.

## Repo Organization

The code is organized as follows:

- the [manifest](manifest.json) is located at the top of the repo
- [background](background) contains background scripts
  - [background-lastfm](background/background-lastfm.js) contains the code for connecting and updating track info to Last.fm
  - [background-hypem](background/background-hypem.js) gives access to the track info provided by the content script
  - [background](background/background.js) keeps track of the running state and updates the info to Last.fm
- [browser-action](browser-action) is where the code for the popup (i.e. the user interface) can be found
- [content-scripts](content-scripts) contains the content script that will be execute on hypem.com
- [images](images) contains all icons and images
- [lib](lib) contains libraries

## License

NowPlaying - HypeMachine is licensed under the [GNU General Public License version 3.0](LICENSE.txt).

Third party licenses are listed in [THIRD-PARTY](THIRD-PARTY.txt).
