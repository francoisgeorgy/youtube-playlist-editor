import React, {Component, Fragment} from 'react';
import {
    buildApiRequest,
    buildPlaylistsRequest,
    buildPlaylistItemsRequest,
    executeRequest,
    moveIntoPlaylist,
    moveMultipleIntoPlaylist,
} from '../utils/gapi';
import './Videos.css';
import {produce} from "immer";


function snippetTitleSort(a, b) {
    return a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase() ? 1 :
           b.snippet.title.toLowerCase() > a.snippet.title.toLowerCase() ? -1 :
           0;
}

class TwinVideos extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isAuthorized: false,
            videosLoading: false,
            playlists: null,
            lists: [{
                playlistId: null,
                videos: [],
                filter: ''
            },{
                playlistId: null,
                videos: [],
                filter: ''
            }],
        };
    }

    static getDerivedStateFromProps(props, state) {
        // console.log("TwinVideos.getDerivedStateFromProps", props);
        if (props.isAuthorized !== state.isAuthorized) {
            return {
                isAuthorized: props.isAuthorized,
            };
        }
        // No state update necessary
        return null;
    }

    componentDidMount() {
        console.log('TwinVideos.componentDidMount');
        this.refresh();
    }

    componentDidUpdate(prevProps, prevState) {

        // At this point, we're in the "commit" phase, so it's safe to load the new data.

        console.log(`TwinVideos.componentDidUpdate, playlistId=${this.state.playlistId}, prev=${prevState.playlistId}`, this.state);

        if (!this.state.isAuthorized) return;

/*
        if (
            !this.state.videosLoading &&
            this.state.playlistId &&
            this.state.videos === null
        ) {
            // !!! only retrieve data if state.videos is empty; otherwise this will generate an endless loop.
            console.log('TwinVideos.componentDidUpdate: call retrieveVideos');
            this.retrieveVideos();
        }
*/

        if (this.state.playlists === null) {
            // !!! only retrieve data if state.playlists is empty; otherwise this will generate an endless loop.
            console.log('TwinVideos.componentDidUpdate: call retrievePlaylists');
            this.retrievePlaylists();
        }
    }

    storePlaylists = data => {

        console.log("TwinVideos.storePlayLists", data.items);

        if (!data) return;

        let list = data.items;
        list.sort(snippetTitleSort);
        this.setState({ playlists: list });
    };

    storeVideos = (listIndex, data, currentToken) => {

        console.log('TwinVideos.storeVideos', currentToken);

        if (!data) return;

        // console.log("TwinVideos.storeVideos", data);

        let list = data.items;
        list.sort(snippetTitleSort);

        this.setState(
            produce(draft => {
                if (currentToken === undefined || !currentToken) {
                    draft.lists[listIndex].videos = list;
                } else {
                    draft.lists[listIndex].videos = [...draft.lists[listIndex].videos, ...list]
                }
            })
        );

/*
        if (currentToken === undefined || !currentToken) {
            console.log('TwinVideos.storeVideos: set new videos list');
            this.setState({ videos: list });
        } else {
            console.log('TwinVideos.storeVideos: append videos to current list');
            this.setState(prevState => ({
                videos: [...prevState.videos, ...list],
                // videos: prevState.videos.concat(list)
            }));
        }
*/

        if (data.nextPageToken) {
            console.log('TwinVideos.storeVideos: get next page with token ' + data.nextPageToken);
            this.retrieveVideos(listIndex, data.nextPageToken);
        }
    };

    retrieveVideos = (listIndex, nextPageToken) => {
        console.log(`TwinVideos.retrieveVideos, playlistId=${this.state.playlistId}, pageToken=${nextPageToken}`);
        // console.log(`TwinVideos.retrieveVideos set videosLoading=true`);
        this.setState({ videosLoading: true });
        executeRequest(
            buildPlaylistItemsRequest(this.state.lists[listIndex].playlistId, nextPageToken),
            data => this.storeVideos(listIndex, data, nextPageToken)
        );
    };

    retrievePlaylists = () => {
        // console.log("TwinVideos.retrievePlayLists");
        executeRequest(buildPlaylistsRequest(), this.storePlaylists);
    };

/*
    removeFromPlaylistState = videoItemId => {
        // console.log("TwinVideos.removeFromPlaylistState", videoItemId);
        let videos = this.state.videos;
        let i = videos.findIndex(function f(e) {
            return e.id === videoItemId;
        });
        // console.log("TwinVideos.removeSuccess: video to delete: ", i, videos[i]);
        videos.splice(i, 1);
        this.setState({ videos });
    };

    removeError = error => {
        console.log('TwinVideos.removeError', error.code, error.message);
    };

    remove = videoItemId => {
        console.log('TwinVideos.remove', videoItemId);
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
*/

    /*
        move = (videoItemId, videoId, playlistId) => {
            console.log('movep', videoItemId, videoId, playlistId);

            moveIntoPlaylist(videoItemId, videoId, playlistId)
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
        };

        moveSuccess = ({ operation, data, videoId, videoItemId }) => {
            console.log('moveSuccess', operation, videoId, videoItemId, data);

            switch (operation) {
                case 'insert':
                    // console.log("insert video ", videoId, data.result.snippet.resourceId.videoId);
                    break;
                case 'delete':
                    // console.log("delete video ", videoItemId);
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
            console.log('TwinVideos.moveVisible');

            let videoItemIds = [];
            let videoIds = [];

            this.state.videos
                .filter(
                    video =>
                        video.snippet.title
                            .toLowerCase()
                            .indexOf(this.state.filter.toLowerCase()) > -1
                )
                .map(video => {
                    videoItemIds.push(video.id);
                    if (!videoIds.includes(video.contentDetails.videoId))
                        videoIds.push(video.contentDetails.videoId); // avoid pushing duplicates
                });

            console.log('moveVisible', videoIds, videoItemIds);

            console.log('moveMultipleIntoPlaylist before');
            // moveMultipleIntoPlaylist(videoItemIds, videoIds, this.state.playlistId).then(this.moveSuccess, this.moveFailure);
            moveMultipleIntoPlaylist(
                videoItemIds,
                videoIds,
                this.state.moveToPlaylistId,
                this.moveSuccess,
                this.moveFailure
            );
            console.log('moveMultipleIntoPlaylist after');
        };
    */

    setPlaylist = (event, listIndex) => {
        console.log("TwinVideos.setMoveToList", event.target.value, listIndex, this.state);
        let id = event.target.value;
        this.setState(
            produce(draft => {
                // console.log("draft", draft.lists);
                // console.log("target", event.target);
                draft.lists[listIndex].playlistId = id;
            }),
            () => this.retrieveVideos(listIndex)
        );
    };

    updateFilter = (event, listIndex) => {
        // console.log("TwinVideos.updateFilter", event.target.value);
        let f = event.target.value;
        this.setState(
            produce(draft => {
                draft.lists[listIndex].filter = f;
            })
        );
    };

    refresh = (listIndex, clearFilter = false) => {
        console.log('refresh');

        if (!this.state.isAuthorized) return;

        this.setState(
            produce(draft => {
                draft.videosLoading = false;
                draft.playlists = null;
                for (let i=0; i<draft.lists; i++) {
                    draft.lists[i] = {
                        playlistId: null,
                        videos: [],
                        filter: clearFilter ? '' : draft.lists[i].filter
                    }
                }
            }),
            () => this.retrievePlaylists()
        );

    };

    render() {

        const {
            isAuthorized,
            // playlistId,
            // videos,
            playlists,
            lists
            // moveToPlaylistId,
            // filter,
        } = this.state;

        // console.log("TwinVideos.render", videos);

        if (!isAuthorized) {
            return <div />;
        } else {
            return (
                <div class="lists">
                {
                    lists.map((list, listIndex) => {
                        let filt = list.filter.toLowerCase();
                        let visibleVideos = list.videos
                            .filter(video => video.snippet.title.toLowerCase().indexOf(filt) > -1)
                            .sort(snippetTitleSort);
                        return (
                            <div className="videos">
                                <div className="playlist-selector">
                                    {playlists && (
                                        <select onChange={(event) => this.setPlaylist(event, listIndex)}>
                                            <option defaultValue={list.playlistId}>select playlist...</option>
                                            {playlists.map((p, i) => <option key={i} value={p.id}>{p.snippet.title}</option>)}
                                        </select>
                                    )}
                                </div>
                                {list.videos &&
                                <Fragment>
                                    <h3>{list.videos.length} videos</h3>
                                    <button onClick={() => this.refresh(listIndex)}>refresh</button>
                                    <div className="filter">
                                        filter: <input type="text" defaultValue={list.filter} onKeyUp={(event) => this.updateFilter(event, listIndex)}/>
                                    </div>
                                    <div class="rows">
                                    {
                                        visibleVideos.map((video, index) =>
                                            <div key={index} className={`row row-${index % 2}`}>
                                                {listIndex % 2 ? <div>MOVE</div> : <div>DEL</div>}
                                                <div className="video-title">{video.snippet.title}</div>
                                                {listIndex % 2 ? <div>DEL</div> : <div>MOVE</div>}
                                            </div>
                                        )
                                    }
                                    </div>
                                </Fragment>}
                            </div>
                        )
                    })
                }
                </div>
            );
        }
    }

}

export default TwinVideos;
