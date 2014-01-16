# NowPlaying - HypeMachine

NowPlaying - HypeMachine is a Chrome browser extension that can tell [Last.fm](http://last.fm) what you are currently listening to on [HypeMachine](http://hypem.com).

HypeMachine already scrobbles your tracks to your Last.fm profile after they have been playing for a while,
but that is only half of the actual scrobbling process.
This Chrome extension will do the other half.
It notifies Last.fm about which track is currently playing.

Using NowPlaying - Hypemachine and HypeMachine's native scrobbling feature together will result in a proper scrobbling process.
This means that you can now use an application like [NowPlaying](http://github.com/volkerl/releases)
when listening to your tracks on HypeMachine.

### Usage

TODO

### Repo Organization

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

### License

NowPlaying - HypeMachine is licensed under the [GNU General Public License version 3.0](LICENSE.txt).

Third party licenses are listed in [THIRD-PARTY](THIRD-PARTY.txt).
