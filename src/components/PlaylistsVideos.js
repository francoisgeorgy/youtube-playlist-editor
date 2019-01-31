import React, { Component } from 'react';
import {
    buildPlaylistItemsRequest,
    buildPlaylistsRequest,
    executeRequest,
} from '../utils/gapi';
import {snippetTitleSort} from "../utils/sorting";

/**
 * Display the list of playlists of the authorized user.
 */
class PlaylistsVideos extends Component {

    constructor(props) {
        super(props);
        console.log('PlaylistsVideos.constructor', props);
        this.state = {
            isAuthorized: false,
            playlists: null,
            playlistId: null,
            // playlistSelected: null,
            videos: [],
            playlistsFilter: '',
            videosFilter: '',
        };
    }

    static getDerivedStateFromProps(props, state) {
        console.log('PlaylistsVideos.getDerivedStateFromProps', props);
        if (props.isAuthorized !== state.isAuthorized) {
            return {
                isAuthorized: props.isAuthorized,
            };
        }

        // No state update necessary
        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        console.log('PlaylistsVideos.componentDidUpdate');
        // At this point, we're in the "commit" phase, so it's safe to load the new data.
        if (this.state.isAuthorized && this.state.playlists === null) {
            // !!! only retrieve data if state.playlists is empty; otherwise this will generate an endless loop.
            this.retrievePlaylists();
        }
    }

    retrievePlaylists = nextPageToken => {
        console.log('PlaylistsVideos.retrievePlaylists', nextPageToken);
        executeRequest(buildPlaylistsRequest(nextPageToken),
            data => this.storePlaylists(data, nextPageToken));
    };

    storePlaylists = (data, currentToken) => {
        console.log('PlaylistsVideos.storePlaylists');

        if (!data) return;

        let list = data.items;
        list.sort(snippetTitleSort);

        if (currentToken === undefined || !currentToken) {
            this.setState({ playlists: list });
        } else {
            this.setState(prevState => ({ playlists: [...prevState.playlists, ...list] }));
        }

        if (data.nextPageToken) {
            this.retrievePlaylists(data.nextPageToken);
        }

    };

    retrieveVideos = nextPageToken => {
        // console.log(`Videos.retrieveVideos, playlistId=${this.state.playlistId}, pageToken=${nextPageToken}`);
        // console.log(`Videos.retrieveVideos set videosLoading=true`);
        this.setState({ videosLoading: true });
        executeRequest(
            buildPlaylistItemsRequest(this.state.playlistId, nextPageToken),
            data => this.storeVideos(data, nextPageToken)
        );
    };

    storeVideos = (data, currentToken) => {
        // console.log('Videos.storeVideos', currentToken);

        if (!data) return;

        // console.log("Videos.storeVideos", data);

        let list = data.items;
        list.sort(snippetTitleSort);

        if (currentToken === undefined || !currentToken) {
            this.setState({ videos: list });
        } else {
            this.setState(prevState => ({ videos: [...prevState.videos, ...list] }));
        }

        if (data.nextPageToken) {
            this.retrieveVideos(data.nextPageToken);
        }
    };

    updatePlaylistsFilter = event => {
        console.log('PlaylistsVideos.updatePlaylistsFilter');
        if (event.keyCode === 27) {
            this.setState({ playlistsFilter: '' });
        } else {
            this.setState({ playlistsFilter: event.target.value });
        }
    };

    updateVideosFilter = event => {
        console.log('PlaylistsVideos.updateVideosFilter');
        if (event.keyCode === 27) {
            this.setState({ videosFilter: '' });
        } else {
            this.setState({ videosFilter: event.target.value });
        }
    };

    selectPlaylist = playlistId => {
        console.log('PlaylistsVideos.selectPlaylist', playlistId);
        this.setState({playlistId: playlistId}, this.retrieveVideos);
    };

    componentDidMount() {
        console.log('PlaylistsVideos.componentDidMount');
        this.retrievePlaylists();
    }

    render() {
        const { isAuthorized, playlistId, playlists, videos, playlistsFilter, videosFilter } = this.state;

        let pfilter = playlistsFilter.toLowerCase();
        //let visibleVideos = videos.filter(video => video.snippet.title.toLowerCase().indexOf(vfilter) > -1).sort(this.getSortFunction(listIndex));
        let visiblePlaylists = playlists ? playlists.filter(playlist => playlist.snippet.title.toLowerCase().indexOf(pfilter) > -1).sort(snippetTitleSort) : [];

        let vfilter = videosFilter.toLowerCase();
        //let visibleVideos = videos.filter(video => video.snippet.title.toLowerCase().indexOf(vfilter) > -1).sort(this.getSortFunction(listIndex));
        let visibleVideos = videos ? videos.filter(video => video.snippet.title.toLowerCase().indexOf(vfilter) > -1).sort(snippetTitleSort) : [];

        if (!isAuthorized) {
            return <div />;
        } else {
            if (playlists) {
                return (
                    <div className="playlists-videos">
                        <div className="column">
                            <div>
                                Playlists • {playlists.length} playlists <button onClick={() => this.retrievePlaylists()}>refresh</button>
                            </div>
                            <div className="filter">
                                filter: <input type="text" value={playlistsFilter} onChange={this.updatePlaylistsFilter} />
                            </div>
                            <div>
                                {visiblePlaylists
                                    .map((playlist, index) => {
                                        return (
                                            <div key={index} className={`row clickable ${playlist.id === playlistId ? 'selected' : ''}`} onClick={() => this.selectPlaylist(playlist.id)}>
                                                <div>{playlist.snippet.title} ({playlist.contentDetails.itemCount}{' '} videos)</div>
                                                <div className="row-option"><a href={`https://www.youtube.com/playlist?list=${playlist.id}`} target="_blank" rel="noopener noreferrer">open in YouTube</a></div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                        <div className="column">
                            <div>
                                Videos • {videos.length} videos <button onClick={this.retrieveVideos}>refresh</button>
                            </div>
                            <div className="filter">
                                filter: <input type="text" value={videosFilter} onChange={this.updateVideosFilter} />
                            </div>
                            <div>
                                {visibleVideos
                                    .map((video, index) => {
                                        return (
                                            <div key={index} className="row">
                                                <a href={`https://www.youtube.com/watch?v=${video.contentDetails.videoId}`} target="_blank" rel="noopener noreferrer">{video.snippet.title}</a>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                );
            } else {
                return <div>Retrieving the playlists...</div>;
            }
        }
    }
}

export default PlaylistsVideos;
