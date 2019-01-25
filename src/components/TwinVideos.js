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
import {
    contentDetailsPublishedAtSort, contentDetailsPublishedAtSortReverse,
    snippetPositionSort, snippetPositionSortReverse,
    snippetPublishedAtSort, snippetPublishedAtSortReverse,
    snippetTitleSort, snippetTitleSortReverse
} from "../utils/sorting";

const SORT_BY_SNIPPET_TITLE = "snippetTitle";
const SORT_BY_SNIPPET_PUBLISHED_AT = "snippetPublishedAt";
const SORT_BY_SNIPPET_POSITION = "snippetPosition";
const SORT_BY_VIDEO_PUBLISHED_AT = "videoPublishedAt";
const SORT_ASCENDING = true;    // false means sort descending


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
                errorMessage: null,
                marked: []      // list of VideoId (ID within the playlist)
            },{
                playlistId: null,
                videos: [],
                filter: '',
                sortMethod: SORT_BY_SNIPPET_TITLE,
                sortDirection: SORT_ASCENDING,
                errorMessage: null,
                marked: []      // list of VideoId (ID within the playlist)
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
        // console.log('TwinVideos.componentDidMount');
        this.refresh();
    }

    componentDidUpdate(prevProps, prevState) {

        // At this point, we're in the "commit" phase, so it's safe to load the new data.

        // console.log(`TwinVideos.componentDidUpdate, playlistId=${this.state.playlistId}, prev=${prevState.playlistId}`, this.state);

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
            // console.log('TwinVideos.componentDidUpdate: call retrievePlaylists');
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

        // console.log("TwinVideos.storePlayLists", data.items);

        if (!data) return;

        let list = data.items;
        list.sort(snippetTitleSort);
        this.setState({ playlists: list });
    };

    storeVideos = (listIndex, data, currentToken) => {

        // console.log('TwinVideos.storeVideos', currentToken);

        if (!data) return;

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
            // console.log('TwinVideos.storeVideos: get next page with token ' + data.nextPageToken);
            this.retrieveVideos(listIndex, data.nextPageToken);
        }
    };

    retrieveVideos = (listIndex, nextPageToken) => {
        // console.log(`TwinVideos.retrieveVideos, playlistId=${this.state.playlistId}, pageToken=${nextPageToken}`);
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

    refreshPlaylists = () => {
        this.retrievePlaylists();
    };

    refreshPlaylist = (listIndex) => {
        // console.log(`refreshPlaylist(${listIndex})`);
        this.setState(
            produce(draft => {
                draft.lists[listIndex].errorMessage = null;
                draft.lists[listIndex].videos = [];
            }),
            () => this.retrieveVideos(listIndex)
        );
    };

    setPlaylist = (event, listIndex) => {
        // console.log("TwinVideos.setMoveToList", event.target.value, listIndex, this.state);
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

    removeFromPlaylistState = (listIndex, playlistItemIds) => {
        // console.log("TwinVideos.removeFromPlaylistState", playlistItemId);
        this.setState(
            produce(draft => {
                let videos = draft.lists[listIndex].videos;
                for (let i=0; i<playlistItemIds.length; i++) {
                    let k = videos.findIndex(video => video.id === playlistItemIds[i]);
                    if (k >= 0) videos.splice(k, 1);
                }
                draft.lists[listIndex].videos = videos;
                draft.lists[listIndex].errorMessage = null;
            })  //,
            //() => this.retrieveVideos(playlistIndex)
        );
    };

    // insertSuccess = (listIndex, { operation, data, videoId, playlistItemId }) => {
    //     console.log('moveSuccess', operation, videoId, playlistItemId, data);
    //     this.refreshPlaylist(listIndex);
    // };

    // removeSuccess = (listIndex, { operation, data, videoId, playlistItemId }) => {
    //     console.log('moveSuccess', operation, videoId, playlistItemId, data);
    //     this.removeFromPlaylistState(listIndex, playlistItemId);
    // };

    getVisibleIds = listIndex => {

        // console.log(`getVisibleIds(${listIndex})`, this.state);

        let filter = this.state.lists[listIndex].filter.toLowerCase();

        let playlistItemIds = [];
        let videoIds = [];

        this.state.lists[listIndex].videos
            .filter(playlistItem => playlistItem.snippet.title.toLowerCase().indexOf(filter) > -1)
            .forEach(playlistItem => {
                playlistItemIds.push(playlistItem.id);
                if (!videoIds.includes(playlistItem.contentDetails.videoId)) {
                    videoIds.push(playlistItem.contentDetails.videoId); // avoid pushing duplicates
                }
            });

        return {
            playlistItemIds,
            videoIds
        }
    };

    mark = (listIndex, playlistItemIds) => {
        this.setState(
            produce(draft => {
                draft.lists[listIndex].marked = Array.isArray(playlistItemIds) ? playlistItemIds : [playlistItemIds];   // IDs within the playlist
            })
        );
    };

    clearMarked = (listIndex) => {
        this.setState(
            produce(draft => {
                draft.lists[listIndex].marked = [];
            })
        );
    };

    progress = (listIndex, {videoId, playlistItemId}) => {
        // console.log("progress", videoId, playlistItemId);
        this.setState(
            produce(draft => {
                let k = draft.lists[listIndex].marked.findIndex(id => id === playlistItemId);
                // console.log("progress k", k, videoId);
                if (k >= 0) draft.lists[listIndex].marked.splice(k, 1);
            })
        );
    };

    failure = (listIndex, error) => {
        this.setState(
            produce(draft => {
                draft.lists[listIndex].errorMessage = error.message;
            })
        );
    };

    copy = (sourceListIndex, targetListIndex, playlistItemId, videoId) => {
        // console.log('copy', sourceListIndex, targetListIndex, playlistItemId, videoId);
        this.mark(sourceListIndex, playlistItemId);
        copyMultipleIntoPlaylist(
            [playlistItemId],
            [videoId],
            this.state.lists[targetListIndex].playlistId,
            (data) => this.progress(sourceListIndex, data),
            () => {
                this.retrievePlaylists();   // update the number of videos per playlist displayed in the dropdown select
                this.refreshPlaylist(targetListIndex);
            },
            (data) => this.failure(sourceListIndex, data.error));
    };

    copyAll = (sourceListIndex, targetListIndex) => {
        // console.log('move', sourceListIndex, targetListIndex, playlistItemId, videoId);
        const { playlistItemIds, videoIds } = this.getVisibleIds(sourceListIndex);
        this.mark(sourceListIndex, playlistItemIds);
        copyMultipleIntoPlaylist(
            playlistItemIds,
            videoIds,
            this.state.lists[targetListIndex].playlistId,
            (data) => this.progress(sourceListIndex, data),
            () => {
                this.retrievePlaylists();   // update the number of videos per playlist displayed in the dropdown select
                this.refreshPlaylist(targetListIndex);
                this.clearMarked(sourceListIndex);
            },
            (data) => this.failure(sourceListIndex, data.error));
    };

    move = (sourceListIndex, targetListIndex, playlistItemId, videoId) => {
        // console.log('move', sourceListIndex, targetListIndex, playlistItemId, videoId);
        this.mark(sourceListIndex, playlistItemId);
        moveMultipleIntoPlaylist(
            [playlistItemId],
            [videoId],
            this.state.lists[targetListIndex].playlistId,
            (data) => {
                this.progress(sourceListIndex, data);
                this.removeFromPlaylistState(sourceListIndex, [data.playlistItemId]);
            },
            () => {
                this.retrievePlaylists();   // update the number of videos per playlist displayed in the dropdown select
                this.refreshPlaylist(targetListIndex);
                this.clearMarked(sourceListIndex);
            },
            (data) => this.failure(sourceListIndex, data.error));
    };

    moveAll = (sourceListIndex, targetListIndex) => {
        // console.log('move', sourceListIndex, targetListIndex, playlistItemId, videoId);
        const { playlistItemIds, videoIds } = this.getVisibleIds(sourceListIndex);
        this.mark(sourceListIndex, playlistItemIds);
        moveMultipleIntoPlaylist(
            playlistItemIds,
            videoIds,
            this.state.lists[targetListIndex].playlistId,
            (data) => {
                this.progress(sourceListIndex, data);
                this.removeFromPlaylistState(sourceListIndex, [data.playlistItemId]);
            },
            () => {
                this.retrievePlaylists();   // update the number of videos per playlist displayed in the dropdown select
                this.refreshPlaylist(targetListIndex);
                this.clearMarked(sourceListIndex);
            },
            (data) => this.failure(sourceListIndex, data.error));
    };

    remove = (listIndex, playlistItemId, videoId) => {
        // console.log('remove', listIndex, playlistItemId, videoId);
        this.mark(listIndex, playlistItemId);
        removeMultipleFromPlaylist(
            [playlistItemId],
            [videoId],
            this.state.lists[listIndex].playlistId,
            (data) => this.progress(listIndex, data),
            () => {
                this.removeFromPlaylistState(listIndex, [playlistItemId]);
                this.clearMarked(listIndex);
            },
            (data) => this.failure(listIndex, data.error));

    };

    removeAll = (listIndex) => {
        // console.log('remove');
        const { playlistItemIds, videoIds } = this.getVisibleIds(listIndex);
        this.mark(listIndex, playlistItemIds);
        removeMultipleFromPlaylist(
            playlistItemIds,
            videoIds,
            this.state.lists[listIndex].playlistId,
            (data) => this.progress(listIndex, data),
            () => {
                this.removeFromPlaylistState(listIndex, playlistItemIds);
                this.clearMarked(listIndex);
            },
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
        // console.log('refresh');
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

        // console.log("render", lists);

        if (!isAuthorized) {
            return <div />;
        } else {
            return (
                <div className="lists">
                {
                    lists.map((list, listIndex) => {
                        // console.log("list.marked", list.marked);
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
                                        {playlists.map((p, i) => <option key={i} value={p.id}>{p.snippet.title}</option>)}
                                    </select> <button onClick={this.refreshPlaylists}>refresh</button>
                                    {' '}
                                    {list.playlistId && <a href={`https://www.youtube.com/playlist?list=${list.playlistId}`} target="_blank" rel="noopener noreferrer">open in YouTube</a>}
                                </div>
                                }
                                {list.errorMessage &&
                                <div className="messages">
                                    <div className="error">{list.errorMessage}<div className="dismiss"><button onClick={() => this.dismissErrorMessage(listIndex)}>dismiss</button></div></div>
                                </div>
                                }
                                {list.playlistId &&
                                <div className="infos">
                                    There are {list.videos.length} videos in this playlist.
                                    {list.videos.length > 0 && <button onClick={() => this.refreshPlaylist(listIndex)}>refresh the list of videos</button>}
                                </div>
                                }
                                {list.videos && list.videos.length > 0 &&
                                <Fragment>
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
                                        visibleVideos.map((video, index) => {
                                            // console.log("video.id", video.id);
                                            let m = list.marked.includes(video.id) ? 'marked' : '';
                                            return (
                                                <div key={index} className={`row row-${index % 2} ${m}`}>
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
                                                            <button className="action-button" title="remove from this playlist" onClick={
                                                                () => this.remove(listIndex,
                                                                    video.id, /* ID within the playlist */
                                                                    video.contentDetails.videoId /* ID within youtube */
                                                                )}>
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        </div>
                                                    }
                                                    <div className="video-title">
                                                        <a href={`https://www.youtube.com/watch?v=${video.contentDetails.videoId}`} target="_blank" rel="noopener noreferrer">{video.snippet.title}</a>
                                                    </div>
                                                    {listIndex % 2
                                                        ? <div>
                                                            <button className="action-button" title="remove from this playlist" onClick={
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
                                            )}
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
