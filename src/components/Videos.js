import React, { Component } from 'react';
import {
    buildApiRequest,
    buildPlaylistsRequest,
    buildPlaylistItemsRequest,
    executeRequest,
    buildPlaylistNameRequest,
    moveMultipleIntoPlaylist,
} from '../utils/gapi';
import './Videos.css';
import {snippetTitleSort} from "../utils/sorting";

/**
 * Display the list of videos for a playlist.
 */
class Videos extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isAuthorized: false,
            playlistName: null,
            playlistId: props.match.params.playlistid,
            videos: null,
            playlists: null,
            moveToPlaylistId: null,
            filter: '',
            videosLoading: false,
        };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.isAuthorized !== state.isAuthorized) {
            return {
                isAuthorized: props.isAuthorized,
            };
        }
        // No state update necessary
        return null;
    }

    componentDidMount() {
        if (this.state.isAuthorized) this.refresh();
    }

    componentDidUpdate(prevProps, prevState) {

        if (!this.state.isAuthorized) return;

        if (this.state.playlistName === null) {
            // Only retrieve data if state.playlistName is empty; otherwise this will generate an endless loop.
            this.retrievePlaylistName();
        }

        if (
            !this.state.videosLoading &&
            this.state.playlistId &&
            this.state.videos === null
        ) {
            this.retrieveVideos();
        }

        if (this.state.playlists === null) {
            this.retrievePlaylists();
        }
    }

    storePlaylists = data => {
        if (!data) return;
        let list = data.items;
        list.sort(snippetTitleSort);
        this.setState({ playlists: list });
    };

    storeVideos = (data, currentToken) => {

        if (!data) return;

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

    updatePlaylistName = playlistName => {
        this.setState({ playlistName });
    };

    retrievePlaylistName = () => {
        if (!this.state.playlistId) {
            return;
        }

        let req = buildPlaylistNameRequest(this.state.playlistId);

        if (!req) {
            console.warn('req is null');
            return;
        }

        req.then(
            function(response) {
                try {
                    this.updatePlaylistName(
                        response.result.items[0].snippet.title
                    );
                } catch (e) {
                    if (e instanceof TypeError) {
                        console.log('buildPlaylistNameRequest incomplete response', e);
                    } else {
                        console.error('buildPlaylistNameRequest unexpected error', e);
                    }
                }
            },
            function() {
                // onRejected handler
                console.warn('buildPlaylistNameRequest rejected');
            },
            this
        );
    };

    retrieveVideos = nextPageToken => {
        this.setState({ videosLoading: true });
        executeRequest(
            buildPlaylistItemsRequest(this.state.playlistId, nextPageToken),
            data => this.storeVideos(data, nextPageToken)
        );
    };

    retrievePlaylists = () => {
        executeRequest(buildPlaylistsRequest(), this.storePlaylists);
    };

    removeFromPlaylistState = videoItemId => {
        let videos = this.state.videos;
        let i = videos.findIndex(function f(e) {
            return e.id === videoItemId;
        });
        videos.splice(i, 1);
        this.setState({ videos });
    };

    removeError = error => {
        console.log('Videos.removeError', error.code, error.message);
    };

    /**
     * Remove a video from the current playlist
     * @param videoItemId ID of the video-item in the current playlist
     */
    remove = videoItemId => {
        if (!videoItemId) return;
        let request = buildApiRequest('DELETE', '/youtube/v3/playlistItems', {
            id: videoItemId,
        });
        executeRequest(
            request,
            () => this.removeFromPlaylistState(videoItemId),
            this.removeError
        );
    };

    createError = error => {
        console.log('Videos.insertError', error);
    };

    insertError = error => {
        console.log('Videos.insertError', error);
    };

    move = (videoItemId, videoId, moveToPlaylistId) => {
/*
        moveIntoPlaylist(videoItemId, videoId, moveToPlaylistId)
            .then(function(response) {
                console.log('movep.moveIntoPlaylist resolved', response);
            })
            .catch(function(reason) {
                console.log(
                    'movep.moveIntoPlaylist rejected',
                    reason,
                    reason.result.error.message
                );
            });
*/
    };

    moveSuccess = ({ operation, data, videoId, videoItemId }) => {
        switch (operation) {
            case 'insert':
                break;
            case 'delete':
                this.removeFromPlaylistState(videoItemId);
                break;
            default:
                console.error(`moveSuccess: unknown operation ${operation}`);
        }
    };

    moveFailure = r => {
        console.log('moveFailure', r);
    };

    moveVisible = () => {

        let videoItemIds = [];
        let videoIds = [];

        this.state.videos
            .filter(video => video.snippet.title.toLowerCase().indexOf(this.state.filter.toLowerCase()) > -1)
            .forEach(video => {
                videoItemIds.push(video.id);
                if (!videoIds.includes(video.contentDetails.videoId)) {     // avoid pushing duplicates
                    videoIds.push(video.contentDetails.videoId);
                }
            });

        moveMultipleIntoPlaylist(
            videoItemIds,
            videoIds,
            this.state.moveToPlaylistId,
            this.moveSuccess,
            this.moveFailure
        );

    };

    setMoveToList = event => {
        this.setState({ moveToPlaylistId: event.target.value });
    };

    updateFilter = event => {
        let f = event.target.value;
        this.setState({ filter: f });
    };

    refresh = (clearFilter = false) => {

        if (!this.state.isAuthorized) return;

        this.setState({
            playlistName: null,
            videos: null,
            playlists: null,
            videosLoading: false,
            filter: clearFilter ? '' : this.state.filter,
        });

        this.retrievePlaylistName();
        this.retrieveVideos();
        this.retrievePlaylists();
    };

    render() {
        const {
            isAuthorized,
            playlistId,
            playlistName,
            videos,
            playlists,
            moveToPlaylistId,
            filter,
        } = this.state;

        if (!isAuthorized) {
            return null;
        } else {
            if (videos) {
                let visibleVideos = videos.filter(video => video.snippet.title.toLowerCase().indexOf(filter.toLowerCase()) > -1);
                visibleVideos.sort(snippetTitleSort);

                return (
                    <div className="videos">
                        <h2>Videos in {playlistName} :</h2>
                        <h3>{videos.length} videos</h3>
                        <button onClick={this.refresh}>refresh</button>
                        <div className="playlist-selector">
                            target playlist:
                            {playlists && (
                                <select onChange={this.setMoveToList}>
                                    <option value="">
                                        select list to move to
                                    </option>
                                    {playlists.map((p, i) => {
                                        return p.id === playlistId ? null : (
                                            <option key={i} value={p.id}>
                                                {p.snippet.title}
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>
                        {moveToPlaylistId &&
                        <div>
                            <button onClick={this.moveVisible}>
                                move visible to target playlist
                            </button>
                        </div>
                        }
                        <div className="filter">
                            filter: <input type="text" value={filter} onChange={this.updateFilter} />
                        </div>
                        <div>
                        {
                            visibleVideos.map(
                                (video, index) => {
                                    return (
                                        <div key={index}>
                                            <a href={`https://www.youtube.com/watch?v=${video.contentDetails.videoId}`} target="_blank" rel="noopener noreferrer">{video.snippet.title}</a>
                                            {' '}
                                            <button onClick={() => this.remove(video.id)}>remove</button>
                                            {moveToPlaylistId &&
                                            <button onClick={() => this.move(video.id, video.contentDetails.videoId, moveToPlaylistId)}>move</button>
                                            }
                                        </div>
                                    );
                                }
                            )
                        }
                        </div>
                    </div>
                );
            } else {
                return <div>Retrieving the list of videos...</div>;
            }
        }
    }

}

export default Videos;
