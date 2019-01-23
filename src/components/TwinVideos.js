import React, {Component, Fragment} from 'react';
import {
    buildPlaylistsRequest,
    buildPlaylistItemsRequest,
    executeRequest,
    moveMultipleIntoPlaylist,
    copyMultipleIntoPlaylist, removeMultipleFromPlaylist,
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
            sync: false,
            lists: [{
                playlistId: null,
                videos: [],
                filter: '',
                sortMethod: SORT_BY_SNIPPET_TITLE,
                sortDirection: SORT_ASCENDING,
                errorMessage: null
            },{
                playlistId: null,
                videos: [],
                filter: '',
                sortMethod: SORT_BY_SNIPPET_TITLE,
                sortDirection: SORT_ASCENDING,
                errorMessage: null
            }]
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

    setSortMethod = (listIndex, method) => {
        // if same method, then flip the direction
        this.setState(
            produce(draft => {
                if (draft.lists[listIndex].sortMethod === method) {
                    draft.lists[listIndex].sortDirection = !draft.lists[listIndex].sortDirection;
                } else {
                    draft.lists[listIndex].sortMethod = method;
                }
            })
        );
    };

    getSortFunction = (listIndex) => {
        let asc = this.state.lists[listIndex].sortDirection;
        switch(this.state.lists[listIndex].sortMethod) {
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

        if (data.nextPageToken) {
            console.log('TwinVideos.storeVideos: get next page with token ' + data.nextPageToken);
            this.retrieveVideos(listIndex, data.nextPageToken);
        }
    };

    retrieveVideos = (listIndex, nextPageToken) => {
        console.log(`TwinVideos.retrieveVideos, playlistId=${this.state.playlistId}, pageToken=${nextPageToken}`);
        // console.log(`TwinVideos.retrieveVideos set videosLoading=true`);
        this.setState({ errorMessage: null, videosLoading: true });
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
        console.log(`refreshPlaylist(${listIndex})`);
        this.setState(
            produce(draft => {
                draft.lists[listIndex].errorMessage = null;
                draft.lists[listIndex].videos = [];
            }),
            () => this.retrieveVideos(listIndex)
        );
    };

    setPlaylist = (event, listIndex) => {
        console.log("TwinVideos.setMoveToList", event.target.value, listIndex, this.state);
        let id = event.target.value;
        this.setState(
            produce(draft => {
                draft.lists[listIndex].errorMessage = null;
                // console.log("draft", draft.lists);
                // console.log("target", event.target);
                draft.lists[listIndex].playlistId = id;
            }),
            () => this.retrieveVideos(listIndex)
        );
    };

    removeFromPlaylistState = (listIndex, videoItemIds) => {
        // console.log("TwinVideos.removeFromPlaylistState", videoItemId);
        this.setState(
            produce(draft => {
                let videos = draft.lists[listIndex].videos;
                for (let i=0; i<videoItemIds.length; i++) {
                    let k = videos.findIndex(video => video.id === videoItemIds[i]);
                    videos.splice(k, 1);
                }
                draft.lists[listIndex].videos = videos;
                draft.lists[listIndex].errorMessage = null;
            })  //,
            //() => this.retrieveVideos(playlistIndex)
        );
    };

    // insertSuccess = (listIndex, { operation, data, videoId, videoItemId }) => {
    //     console.log('moveSuccess', operation, videoId, videoItemId, data);
    //     this.refreshPlaylist(listIndex);
    // };

    // removeSuccess = (listIndex, { operation, data, videoId, videoItemId }) => {
    //     console.log('moveSuccess', operation, videoId, videoItemId, data);
    //     this.removeFromPlaylistState(listIndex, videoItemId);
    // };

    getVisibleIds = listIndex => {

        let filter = this.state.lists[listIndex].filter.toLowerCase();

        let videoItemIds = [];
        let videoIds = [];

        this.state.lists[listIndex].videos
            .filter(video => video.snippet.title.toLowerCase().indexOf(filter) > -1)
            .forEach(video => {
                videoItemIds.push(video.id);
                if (!videoIds.includes(video.contentDetails.videoId)) {
                    videoIds.push(video.contentDetails.videoId); // avoid pushing duplicates
                }
            });

        return {
            videoItemIds,
            videoIds
        }
    };

    failure = (listIndex, error) => {
        this.setState(
            produce(draft => {
                draft.lists[listIndex].errorMessage = error.message;
            })
        );
    };

    copy = (sourceListIndex, targetListIndex, videoItemId, videoId) => {
        console.log('copy', sourceListIndex, targetListIndex, videoItemId, videoId);
        copyMultipleIntoPlaylist(
            [videoItemId],
            [videoId],
            this.state.lists[targetListIndex].playlistId,
            () => {
                this.retrievePlaylists();   // update the number of videos per playlist displayed in the dropdown select
                this.refreshPlaylist(targetListIndex);
            },
            (data) => this.failure(sourceListIndex, data.error));
    };

    copyAll = (sourceListIndex, targetListIndex) => {
        // console.log('move', sourceListIndex, targetListIndex, videoItemId, videoId);
        const { videoItemIds, videoIds } = this.getVisibleIds(sourceListIndex);
        copyMultipleIntoPlaylist(
            videoItemIds,
            videoIds,
            this.state.lists[targetListIndex].playlistId,
            () => {
                this.retrievePlaylists();   // update the number of videos per playlist displayed in the dropdown select
                this.refreshPlaylist(targetListIndex)
            },
            (data) => this.failure(sourceListIndex, data.error));
    };

    move = (sourceListIndex, targetListIndex, videoItemId, videoId) => {
        console.log('move', sourceListIndex, targetListIndex, videoItemId, videoId);
        moveMultipleIntoPlaylist(
            [videoItemId],
            [videoId],
            this.state.lists[targetListIndex].playlistId,
            () => {
                this.retrievePlaylists();   // update the number of videos per playlist displayed in the dropdown select
                this.refreshPlaylist(targetListIndex)
            },
            () => this.removeFromPlaylistState(sourceListIndex, [videoItemId]),
            (data) => this.failure(sourceListIndex, data.error));
    };

    moveAll = (sourceListIndex, targetListIndex) => {
        // console.log('move', sourceListIndex, targetListIndex, videoItemId, videoId);

        const { videoItemIds, videoIds } = this.getVisibleIds(sourceListIndex);

        moveMultipleIntoPlaylist(
            videoItemIds,
            videoIds,
            this.state.lists[targetListIndex].playlistId,
            () => {
                this.retrievePlaylists();   // update the number of videos per playlist displayed in the dropdown select
                this.refreshPlaylist(targetListIndex)
            },
            () => this.removeFromPlaylistState(sourceListIndex, videoItemIds),
            (data) => this.failure(sourceListIndex, data.error));
    };

    remove = (listIndex, videoItemId, videoId) => {
        console.log('remove', listIndex, videoItemId, videoId);
        removeMultipleFromPlaylist(
            [videoItemId],
            [videoId],
            this.state.lists[listIndex].playlistId,
            () => this.removeFromPlaylistState(listIndex, [videoItemId]),
            (data) => this.failure(listIndex, data.error));

    };

    removeAll = (listIndex) => {
        console.log('remove');

        const { videoItemIds, videoIds } = this.getVisibleIds(listIndex);

        // let filter = this.state.lists[listIndex].filter.toLowerCase();
        //
        // let videoItemIds = [];
        // let videoIds = [];
        //
        // this.state.lists[listIndex].videos
        //     .filter(video => video.snippet.title.toLowerCase().indexOf(filter) > -1)
        //     .map(video => {
        //         videoItemIds.push(video.id);
        //         if (!videoIds.includes(video.contentDetails.videoId)) {
        //             videoIds.push(video.contentDetails.videoId); // avoid pushing duplicates
        //         }
        //     });

        removeMultipleFromPlaylist(
            videoItemIds,
            videoIds,
            this.state.lists[listIndex].playlistId,
            () => this.removeFromPlaylistState(listIndex, videoItemIds),
            (data) => this.failure(listIndex, data.error));

    };

    updateFilter = (event, listIndex) => {
        // console.log("TwinVideos.updateFilter", event.target.value);
        let f = event.target.value;
        this.setState(
            produce(draft => {
                for (let i=0; i<draft.lists.length; i++) {
                    if (draft.sync || i === listIndex) {
                        draft.lists[i].errorMessage = null;
                        draft.lists[i].filter = f;
                    }
                }
            })
        );
    };

    clearFilter = listIndex => {
        this.setState(
            produce(draft => {
                draft.lists[listIndex].filter = '';
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
                        filter: clearFilter ? '' : draft.lists[i].filter,
                        errorMessage: null
                    }
                }
            }),
            () => this.retrievePlaylists()
        );
    };

    dismissErrorMessage = (listIndex) => {
        this.setState(produce(draft => {
            draft.lists[listIndex].errorMessage = null;
        }));
    };

    toggleSync = () => {
        this.setState({sync: !this.state.sync});
    };


    render() {

        const { isAuthorized, playlists, lists, sortDirection, sync } = this.state;

        if (!isAuthorized) {
            return <div />;
        } else {
            return (
                <div className="lists">
                {
                    lists.map((list, listIndex) => {
                        let sortMethod = lists[listIndex].sortMethod;
                        let filt = list.filter.toLowerCase();
                        let visibleVideos = list.videos
                            .filter(video => video.snippet.title.toLowerCase().indexOf(filt) > -1)
                            .sort(this.getSortFunction(listIndex));
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
                                {list.errorMessage &&
                                <div className="messages">
                                    <div className="error">{list.errorMessage}<div className="dismiss"><button onClick={() => this.dismissErrorMessage(listIndex)}>dismiss</button></div></div>
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
                                        {listIndex === 0 &&
                                        <div className="sync">
                                            <button onClick={this.toggleSync}>sync filter&sorting: {sync ? "ON" : "OFF"}</button>
                                        </div>
                                        }
                                        <div className="filter">
                                            Filter: <input type="text" value={list.filter} onChange={(event) => this.updateFilter(event, listIndex)} />
                                            <button onClick={() => this.clearFilter(listIndex)}>clear filter</button>
                                            {visibleVideos.length} videos shown
                                        </div>
                                    </div>
                                    {visibleVideos.length > 0 &&
                                    <div>
                                        {listIndex % 2
                                            ? <div className="batch-actions">
                                                Apply to all videos shown below:
                                                <button title="remove shown videos from the playlist" onClick={() => this.removeAll(listIndex)}><i className="fas fa-trash-alt"></i> remove all</button>
                                                <button onClick={() => this.copyAll(listIndex, listIndex - 1)}><i className="fas fa-angle-double-left"></i> copy all</button>
                                                <button onClick={() => this.moveAll(listIndex, listIndex - 1)}><i className="fas fa-angle-left"></i> move all</button>
                                            </div>
                                            : <div className="batch-actions">
                                                Apply to all videos shown below:
                                                <button title="remove shown videos from the playlist" onClick={() => this.removeAll(listIndex)}><i className="fas fa-trash-alt"></i> remove all</button>
                                                <button onClick={() => this.copyAll(listIndex, listIndex + 1)}>copy all <i className="fas fa-angle-double-right"></i></button>
                                                <button onClick={() => this.moveAll(listIndex, listIndex + 1)}>move all <i className="fas fa-angle-right"></i></button>
                                            </div>
                                        }
                                    </div>
                                    }
                                    <div className="sorting">
                                        <button onClick={() => this.setSortMethod(listIndex, SORT_BY_SNIPPET_TITLE)} className={sortMethod === SORT_BY_SNIPPET_TITLE ? "text-button active" : "text-button"}>
                                            title<i className={sortDirection ? "fas fa-sort-alpha-down" : "fas fa-sort-alpha-up"}></i>
                                        </button>
                                        <button onClick={() => this.setSortMethod(listIndex, SORT_BY_SNIPPET_PUBLISHED_AT)} className={sortMethod === SORT_BY_SNIPPET_PUBLISHED_AT ? "text-button active" : "text-button"}>
                                            added to playlist<i className={sortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                        </button>
                                        <button onClick={() => this.setSortMethod(listIndex, SORT_BY_VIDEO_PUBLISHED_AT)} className={sortMethod === SORT_BY_VIDEO_PUBLISHED_AT ? "text-button active" : "text-button"}>
                                            video created<i className={sortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                        </button>
                                        <button onClick={() => this.setSortMethod(listIndex, SORT_BY_SNIPPET_POSITION)} className={sortMethod === SORT_BY_SNIPPET_POSITION ? "text-button active" : "text-button"}>
                                            position<i className={sortDirection ? "fas fa-sort-numeric-down" : "fas fa-sort-numeric-up"}></i>
                                        </button>
                                    </div>
                                    <div className="rows">
                                    {
                                        visibleVideos.map((video, index) =>
                                            <div key={index} className={`row row-${index % 2}`}>
                                                {listIndex % 2
                                                    ? <div>
                                                        <button className="action-button" onClick={
                                                            () => this.move(listIndex, listIndex - 1,
                                                                video.id, /* ID within the playlist */
                                                                video.contentDetails.videoId /* ID within youtube */
                                                            )}>
                                                            <i className="fas fa-angle-left"></i> move
                                                        </button>
                                                        <button className="action-button" onClick={
                                                            () => this.copy(listIndex, listIndex - 1,
                                                                video.id, /* ID within the playlist */
                                                                video.contentDetails.videoId /* ID within youtube */
                                                            )}>
                                                            <i className="fas fa-angle-double-left"></i> copy
                                                        </button>
                                                      </div>
                                                    : <div>
                                                        <button title="remove from this playlist" onClick={
                                                            () => this.remove(listIndex,
                                                                video.id, /* ID within the playlist */
                                                                video.contentDetails.videoId /* ID within youtube */
                                                            )}>
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    </div>
                                                }
                                                <div className="video-title">{video.snippet.title}</div>
                                                {listIndex % 2
                                                    ? <div>
                                                        <button title="remove from this playlist" onClick={
                                                            () => this.remove(listIndex,
                                                                video.id, /* ID within the playlist */
                                                                video.contentDetails.videoId /* ID within youtube */
                                                            )}>
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                      </div>
                                                    : <div>
                                                        <button className="action-button" onClick={
                                                            () => this.copy(listIndex, listIndex + 1,
                                                                video.id, /* ID within the playlist */
                                                                video.contentDetails.videoId /* ID within youtube */
                                                            )}>copy <i className="fas fa-angle-double-right"></i>
                                                        </button>
                                                        <button className="action-button" onClick={
                                                            () => this.move(listIndex, listIndex + 1,
                                                                video.id, /* ID within the playlist */
                                                                video.contentDetails.videoId /* ID within youtube */
                                                            )}>move <i className="fas fa-angle-right"></i>
                                                        </button>
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
