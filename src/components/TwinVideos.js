import React, {Component, Fragment} from 'react';
import {
    buildApiRequest,
    buildPlaylistsRequest,
    buildPlaylistItemsRequest,
    executeRequest,
    moveIntoPlaylist,
    moveMultipleIntoPlaylist, copyMultipleIntoPlaylist,
} from '../utils/gapi';
import './Videos.css';
import {produce} from "immer";

const SORT_BY_SNIPPET_TITLE = "snippetTitle";
const SORT_BY_SNIPPET_PUBLISHED_AT = "snippetPublishedAt";
const SORT_BY_SNIPPET_POSITION = "snippetPosition";
const SORT_BY_VIDEO_PUBLISHED_AT = "videoPublishedAt";
const SORT_ASCENDING = true;    // false means sort descending

function snippetTitleSort(a, b) {
    return a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase() ? 1 :
           b.snippet.title.toLowerCase() > a.snippet.title.toLowerCase() ? -1 :
           0;
}

function snippetPublishedAtSort(a, b) {
    let d1 = Date.parse(a.snippet.publishedAt);
    let d2 = Date.parse(b.snippet.publishedAt);
    return d1 > d2 ? 1 :
           d2 > d1 ? -1 :
           0;
}

function snippetPositionSort(a, b) {
    return a.snippet.position > b.snippet.position ? 1 :
           b.snippet.position > a.snippet.position ? -1 :
           0;
}

function contentDetailsPublishedAtSort(a, b) {
    let d1 = Date.parse(a.contentDetails.publishedAt);
    let d2 = Date.parse(b.contentDetails.publishedAt);
    return d1 > d2 ? 1 :
           d2 > d1 ? -1 :
           0;
}

function snippetTitleSortReverse(b, a) {
    return a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase() ? 1 :
        b.snippet.title.toLowerCase() > a.snippet.title.toLowerCase() ? -1 :
            0;
}

function snippetPublishedAtSortReverse(b, a) {
    let d1 = Date.parse(a.snippet.publishedAt);
    let d2 = Date.parse(b.snippet.publishedAt);
    return d1 > d2 ? 1 :
        d2 > d1 ? -1 :
            0;
}

function snippetPositionSortReverse(b, a) {
    return a.snippet.position > b.snippet.position ? 1 :
        b.snippet.position > a.snippet.position ? -1 :
            0;
}

function contentDetailsPublishedAtSortReverse(b, a) {
    let d1 = Date.parse(a.contentDetails.publishedAt);
    let d2 = Date.parse(b.contentDetails.publishedAt);
    return d1 > d2 ? 1 :
        d2 > d1 ? -1 :
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
            sortMethod: SORT_BY_SNIPPET_TITLE,
            sortDirection: SORT_ASCENDING
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

    setSortMethod = (e, method) => {
        e.preventDefault();
        // if same method, then flip the direction
        if (this.state.sortMethod === method) {
            this.setState({sortDirection: !this.state.sortDirection});
        } else {
            this.setState({sortMethod: method});
        }
    };

    getSortFunction = () => {
        let asc = this.state.sortDirection;
        switch(this.state.sortMethod) {
            case SORT_BY_SNIPPET_TITLE : return asc ? snippetTitleSort : snippetTitleSortReverse;
            case SORT_BY_SNIPPET_PUBLISHED_AT : return asc ? snippetPublishedAtSort : snippetPublishedAtSortReverse;
            case SORT_BY_SNIPPET_POSITION : return asc ? snippetPositionSort : snippetPositionSortReverse;
            case SORT_BY_VIDEO_PUBLISHED_AT : return asc ? contentDetailsPublishedAtSort : contentDetailsPublishedAtSortReverse;
            default : return snippetTitleSort;
        }
    };

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

    refreshPlaylist = (listIndex) => {
        this.setState(
            produce(draft => {
                draft.lists[listIndex].videos = [];
            }),
            () => this.retrieveVideos(listIndex)
        );
    };

/*

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



    removeFromPlaylistState = (playlistIndex, videoItemId) => {
        // console.log("TwinVideos.removeFromPlaylistState", videoItemId);
        this.setState(
            produce(draft => {
                let videos = draft.lists[playlistIndex].videos;
                let i = videos.findIndex(v => v.id === videoItemId);
                videos.splice(i, 1);
                draft.lists[playlistIndex].videos = videos
            })  //,
            //() => this.retrieveVideos(playlistIndex)
        );
    };

    moveInsertSuccess = (listIndex, { operation, data, videoId, videoItemId }) => {
        console.log('moveSuccess', operation, videoId, videoItemId, data);
        // switch (operation) {
        //     case 'insert':
        //         // console.log("insert video ", videoId, data.result.snippet.resourceId.videoId);
                this.refreshPlaylist(listIndex);
        //         break;
        //     case 'delete':
        //         // console.log("delete video ", videoItemId);
        //         this.removeFromPlaylistState(sourceListIndex, videoItemId);
        //         break;
        //     default:
        //         console.error(`moveSuccess: unknown operation ${operation}`);
        // }
    };

    moveDeleteSuccess = (listIndex, { operation, data, videoId, videoItemId }) => {
        console.log('moveSuccess', operation, videoId, videoItemId, data);
        // switch (operation) {
        //     case 'insert':
        //         // console.log("insert video ", videoId, data.result.snippet.resourceId.videoId);
        //         this.refreshPlaylist(targetListIndex);
        //         break;
        //     case 'delete':
        //         // console.log("delete video ", videoItemId);
                this.removeFromPlaylistState(listIndex, videoItemId);
        //         break;
        //     default:
        //         console.error(`moveSuccess: unknown operation ${operation}`);
        // }
    };

    copy = (e, sourceListIndex, targetListIndex, videoItemId, videoId) => {
        console.log('copy', sourceListIndex, targetListIndex, videoItemId, videoId);

        e.preventDefault();     // [...] you cannot return false to prevent default behavior in React. You must call preventDefault explicitly.

        copyMultipleIntoPlaylist(
            [videoItemId],
            [videoId],
            this.state.lists[targetListIndex].playlistId,
            (result) => this.moveInsertSuccess(targetListIndex, result));

    };

    move = (e, sourceListIndex, targetListIndex, videoItemId, videoId) => {
        console.log('move', sourceListIndex, targetListIndex, videoItemId, videoId);

        e.preventDefault();     // [...] you cannot return false to prevent default behavior in React. You must call preventDefault explicitly.

        moveMultipleIntoPlaylist(
            [videoItemId],
            [videoId],
            this.state.lists[targetListIndex].playlistId,
            (result) => this.moveInsertSuccess(targetListIndex, result),
            (result) => this.moveDeleteSuccess(sourceListIndex, result));

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
            lists,
            sortMethod, sortDirection
            // moveToPlaylistId,
            // filter,
        } = this.state;

        // console.log("TwinVideos.render", videos);

        if (!isAuthorized) {
            return <div />;
        } else {
            return (
                <div className="lists">
                {
                    lists.map((list, listIndex) => {
                        let filt = list.filter.toLowerCase();
                        let visibleVideos = list.videos
                            .filter(video => video.snippet.title.toLowerCase().indexOf(filt) > -1)
                            .sort(this.getSortFunction());
                        return (
                            <div className="videos" key={listIndex}>
                                {playlists &&
                                <div className="playlist-selector">
                                    <select onChange={(event) => this.setPlaylist(event, listIndex)}>
                                        <option defaultValue={list.playlistId}>select playlist...</option>
                                        {playlists.map((p, i) => <option key={i} value={p.id}>{p.snippet.title} ({p.contentDetails.itemCount})</option>)}
                                    </select>
                                </div>
                                }
                                {list.videos && list.videos.length > 0 &&
                                <Fragment>
                                    <div className="infos">
                                        There are {list.videos.length} videos in this playlist.
                                        <button onClick={() => this.refreshPlaylist(listIndex)}>refresh the list of videos</button>
                                    </div>
                                    {/*<button onClick={() => this.refresh(listIndex)}>refresh</button>*/}
                                    <div className="filtering">
                                        <div className="filter">
                                            Filter: <input type="text" defaultValue={list.filter} onKeyUp={(event) => this.updateFilter(event, listIndex)} />
                                            <button>clear filter</button>
                                            {visibleVideos.length} videos shown
                                        </div>
                                    </div>
                                    {visibleVideos.length > 0 &&
                                    <div>
                                        <div className="batch-actions">
                                            Apply to all videos shown below:
                                            <button title="remove shown videos from the playlist">remove all</button>
                                            <button>copy all ▶</button>
                                            <button>move all ▶</button>
                                        </div>
                                    </div>
                                    }
                                    <div className="sorting">
                                        sort by
                                        <a href="#" onClick={(e) => this.setSortMethod(e, SORT_BY_SNIPPET_TITLE)}
                                            className={sortMethod === SORT_BY_SNIPPET_TITLE ? "active" : ""}>
                                            title
                                            <i className={sortDirection ? "fas fa-sort-alpha-down" : "fas fa-sort-alpha-up"}></i>
                                        </a>
                                        <a href="#" onClick={(e) => this.setSortMethod(e, SORT_BY_SNIPPET_PUBLISHED_AT)}
                                           className={sortMethod === SORT_BY_SNIPPET_PUBLISHED_AT ? "active" : ""}>
                                            added to playlist
                                            <i className={sortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                        </a>
                                        <a href="#" onClick={(e) => this.setSortMethod(e, SORT_BY_VIDEO_PUBLISHED_AT)}
                                           className={sortMethod === SORT_BY_VIDEO_PUBLISHED_AT ? "active" : ""}>
                                            video created
                                            <i className={sortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                        </a>
                                        <a href="#" onClick={(e) => this.setSortMethod(e, SORT_BY_SNIPPET_POSITION)}
                                           className={sortMethod === SORT_BY_SNIPPET_POSITION ? "active" : ""}>
                                            position
                                            <i className={sortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                        </a>
                                    </div>
                                    <div className="rows">
                                    {
                                        visibleVideos.map((video, index) =>
                                            <div key={index} className={`row row-${index % 2}`}>
                                                {listIndex % 2
                                                    ? <div>
                                                        <button>◀ MOVE</button>
                                                        <button>◀ COPY</button>
                                                      </div>
                                                    : <div>
                                                        <a href="#" title="remove from this playlist">
                                                            <i className="fas fa-trash-alt"></i>
                                                        </a>
                                                    </div>
                                                }
                                                <div className="video-title">{video.snippet.title}</div>
                                                {listIndex % 2
                                                    ? <div>
                                                        <a href="#" title="remove from this playlist">
                                                              <i className="fas fa-trash-alt"></i>
                                                        </a>
                                                      </div>
                                                    : <div>
                                                        <a className="action-button" href="#" onClick={
                                                            (e) => this.copy(e, listIndex, listIndex + 1,
                                                                             video.id, /* ID within the playlist */
                                                                             video.contentDetails.videoId /* ID within youtube */
                                                        )}>copy <i className="fas fa-angle-double-right"></i></a>
                                                        <a className="action-button" href="#" onClick={
                                                            (e) => this.move(e, listIndex, listIndex + 1,
                                                                                video.id, /* ID within the playlist */
                                                                                video.contentDetails.videoId /* ID within youtube */
                                                        )}>move <i className="fas fa-angle-right"></i></a>
                                                      </div>
                                                }
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
