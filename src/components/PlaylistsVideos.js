import React, { Component } from 'react';
import {
    buildPlaylistItemsRequest,
    buildPlaylistsRequest,
    executeRequest,
} from '../utils/gapi';
import {
    contentDetailsPublishedAtSort, contentDetailsPublishedAtSortReverse,
    snippetPositionSort, snippetPositionSortReverse,
    snippetPublishedAtSort, snippetPublishedAtSortReverse,
    snippetTitleSort, snippetTitleSortReverse,
    SORT_ASCENDING, SORT_BY_SNIPPET_POSITION,
    SORT_BY_SNIPPET_PUBLISHED_AT,
    SORT_BY_SNIPPET_TITLE,
    SORT_BY_VIDEO_PUBLISHED_AT
} from "../utils/sorting";
import {produce} from "immer";


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
            playlistsFilter: '',
            playlistsSortMethod: SORT_BY_SNIPPET_TITLE,
            playlistsSortDirection: SORT_ASCENDING,
            videos: [],
            videosFilter: '',
            videosSortMethod: SORT_BY_SNIPPET_TITLE,
            videosSortDirection: SORT_ASCENDING,
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

    setPlaylistsSortMethod = method => {
        // if same method, then flip the direction
        this.setState(
            produce(draft => {
                if (draft.playlistsSortMethod === method) {
                    draft.playlistsSortDirection = !draft.playlistsSortDirection;
                } else {
                    draft.playlistsSortMethod = method;
                }
            })
        );
    };

    getPlaylistsSortFunction = () => {
        let asc = this.state.playlistsSortDirection;
        switch(this.state.playlistsSortMethod) {
            case SORT_BY_SNIPPET_TITLE : return asc ? snippetTitleSort : snippetTitleSortReverse;
            case SORT_BY_SNIPPET_PUBLISHED_AT : return asc ? snippetPublishedAtSort : snippetPublishedAtSortReverse;
            case SORT_BY_SNIPPET_POSITION : return asc ? snippetPositionSort : snippetPositionSortReverse;
            case SORT_BY_VIDEO_PUBLISHED_AT : return asc ? contentDetailsPublishedAtSort : contentDetailsPublishedAtSortReverse;
            default : return snippetTitleSort;
        }
    };

    setVideosSortMethod = method => {
        // if same method, then flip the direction
        this.setState(
            produce(draft => {
                if (draft.videosSortMethod === method) {
                    draft.videosSortDirection = !draft.videosSortDirection;
                } else {
                    draft.videosSortMethod = method;
                }
            })
        );
    };

    getVideosSortFunction = () => {
        let asc = this.state.videosSortDirection;
        switch(this.state.videosSortMethod) {
            case SORT_BY_SNIPPET_TITLE : return asc ? snippetTitleSort : snippetTitleSortReverse;
            case SORT_BY_SNIPPET_PUBLISHED_AT : return asc ? snippetPublishedAtSort : snippetPublishedAtSortReverse;
            case SORT_BY_SNIPPET_POSITION : return asc ? snippetPositionSort : snippetPositionSortReverse;
            case SORT_BY_VIDEO_PUBLISHED_AT : return asc ? contentDetailsPublishedAtSort : contentDetailsPublishedAtSortReverse;
            default : return snippetTitleSort;
        }
    };

    retrievePlaylists = nextPageToken => {
        // console.log('PlaylistsVideos.retrievePlaylists', nextPageToken);
        executeRequest(buildPlaylistsRequest(nextPageToken),
            data => this.storePlaylists(data, nextPageToken));
    };

    storePlaylists = (data, currentToken) => {
        console.log('PlaylistsVideos.storePlaylists');

        if (!data) return;

        let list = data.items;
        list.sort(snippetTitleSort);

        console.log('PlaylistsVideos.storePlaylists', list);

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
        executeRequest(
            buildPlaylistItemsRequest(this.state.playlistId, nextPageToken),
            data => this.storeVideos(data, nextPageToken)
        );
    };

    refreshVideos = () => {
        this.setState({videos: []}, this.retrieveVideos);
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

    clearPlaylistsFilter = () => {
        this.setState({playlistsFilter: ''});
    };

    updateVideosFilter = event => {
        console.log('PlaylistsVideos.updateVideosFilter');
        if (event.keyCode === 27) {
            this.setState({ videosFilter: '' });
        } else {
            this.setState({ videosFilter: event.target.value });
        }
    };

    clearVideosFilter = () => {
        this.setState({videosFilter: ''});
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
        const { isAuthorized, playlistId, playlists, videos, playlistsFilter, videosFilter, playlistsSortMethod, videosSortMethod, playlistsSortDirection, videosSortDirection } = this.state;

        let pfilter = playlistsFilter.toLowerCase();
        //let visibleVideos = videos.filter(video => video.snippet.title.toLowerCase().indexOf(vfilter) > -1).sort(this.getSortFunction(listIndex));
        let visiblePlaylists = playlists ? playlists.filter(playlist => playlist.snippet.title.toLowerCase().indexOf(pfilter) > -1).sort(this.getPlaylistsSortFunction()) : [];

        let vfilter = videosFilter.toLowerCase();
        //let visibleVideos = videos.filter(video => video.snippet.title.toLowerCase().indexOf(vfilter) > -1).sort(this.getSortFunction(listIndex));
        let visibleVideos = videos ? videos.filter(video => video.snippet.title.toLowerCase().indexOf(vfilter) > -1).sort(this.getVideosSortFunction()) : [];

        if (!isAuthorized) {
            return null;
        } else {
            if (playlists) {
                return (
                    <div className="playlists-videos">
                        <div className="column-header">
                            <div>
                                <span className="strong">Playlists</span> • {playlists.length} playlists <button onClick={() => this.retrievePlaylists()}>refresh</button>
                            </div>
                            <div className="filter">
                                filter: <input type="text" value={playlistsFilter} onChange={this.updatePlaylistsFilter} /> <button onClick={this.clearPlaylistsFilter}>clear filter</button>
                            </div>
                            <div className="sorting">
                                <button onClick={() => this.setPlaylistsSortMethod(SORT_BY_SNIPPET_TITLE)} className={playlistsSortMethod === SORT_BY_SNIPPET_TITLE ? "text-button active" : "text-button"}>
                                    title<i className={playlistsSortDirection ? "fas fa-sort-alpha-down" : "fas fa-sort-alpha-up"}></i>
                                </button>
{/*
                                <button onClick={() => this.setPlaylistsSortMethod(SORT_BY_SNIPPET_PUBLISHED_AT)} className={playlistsSortMethod === SORT_BY_SNIPPET_PUBLISHED_AT ? "text-button active" : "text-button"}>
                                    added to playlist<i className={playlistsSortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                </button>
                                <button onClick={() => this.setPlaylistsSortMethod(SORT_BY_VIDEO_PUBLISHED_AT)} className={playlistsSortMethod === SORT_BY_VIDEO_PUBLISHED_AT ? "text-button active" : "text-button"}>
                                    video created<i className={playlistsSortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                </button>
                                <button onClick={() => this.setPlaylistsSortMethod(SORT_BY_SNIPPET_POSITION)} className={playlistsSortMethod === SORT_BY_SNIPPET_POSITION ? "text-button active" : "text-button"}>
                                    position<i className={playlistsSortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                </button>
*/}
                            </div>
                        </div>
                        <div className="column-header">
                            <div>
                                <span className="strong">Videos</span> • {videos.length} videos <button onClick={this.refreshVideos}>refresh</button>
                            </div>
                            <div className="filter">
                                filter: <input type="text" value={videosFilter} onChange={this.updateVideosFilter} /> <button onClick={this.clearVideosFilter}>clear filter</button>
                            </div>
                            <div className="sorting">
                                <button onClick={() => this.setVideosSortMethod(SORT_BY_SNIPPET_TITLE)} className={videosSortMethod === SORT_BY_SNIPPET_TITLE ? "text-button active" : "text-button"}>
                                    title<i className={videosSortDirection ? "fas fa-sort-alpha-down" : "fas fa-sort-alpha-up"}></i>
                                </button>
                                <button onClick={() => this.setVideosSortMethod(SORT_BY_SNIPPET_PUBLISHED_AT)} className={videosSortMethod === SORT_BY_SNIPPET_PUBLISHED_AT ? "text-button active" : "text-button"}>
                                    added to playlist<i className={videosSortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                </button>
                                <button onClick={() => this.setVideosSortMethod(SORT_BY_VIDEO_PUBLISHED_AT)} className={videosSortMethod === SORT_BY_VIDEO_PUBLISHED_AT ? "text-button active" : "text-button"}>
                                    video created<i className={videosSortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                </button>
                                <button onClick={() => this.setVideosSortMethod(SORT_BY_SNIPPET_POSITION)} className={videosSortMethod === SORT_BY_SNIPPET_POSITION ? "text-button active" : "text-button"}>
                                    position<i className={videosSortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                </button>
                            </div>
                        </div>
                        <div className="column-content">
                            {visiblePlaylists
                                .map((playlist, index) => {
                                    return (
                                        <div key={index} className={`row clickable ${playlist.id === playlistId ? 'selected' : ''}`} onClick={() => this.selectPlaylist(playlist.id)}>
                                            <div className="row-main">{playlist.snippet.title} ({playlist.contentDetails.itemCount}{' '} videos)</div>
                                            <div className="row-option"><a href={`https://www.youtube.com/playlist?list=${playlist.id}`} target="_blank" rel="noopener noreferrer">open in YouTube <i className="fas fa-external-link-alt"></i></a></div>
                                        </div>
                                    );
                                })}
                        </div>
                        <div className="column-content">
                            {(playlistId === null) &&
                            <div>
                                <span className="italic">Please select a playlist</span>
                            </div>
                            }
                            {(playlistId !== null) && (visibleVideos.length === 0) &&
                            <div>
                                <span className="italic">Empty playlist</span>
                            </div>
                            }
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
                );
            } else {
                return <div className="default-content">Retrieving the playlists...</div>;
            }
        }
    }
}

export default PlaylistsVideos;
