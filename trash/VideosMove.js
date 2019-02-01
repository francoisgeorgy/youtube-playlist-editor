import React, { Component } from 'react';
import {
    buildApiRequest,
    buildPlaylistsRequest,
    buildPlaylistItemsRequest,
    executeRequest,
    buildPlaylistNameRequest,
    moveIntoPlaylist,
    moveMultipleIntoPlaylist,
} from '../utils/gapi';
import './Videos.css';
import {snippetTitleSort} from "../utils/sorting";

/**
 * Display the list of videos for a playlist.
 */
class VideosMove extends Component {

    constructor(props) {
        super(props);
        // console.log("Videos.constructor", props);
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
        // console.log("Videos.getDerivedStateFromProps", props);
        if (props.isAuthorized !== state.isAuthorized) {
            return {
                isAuthorized: props.isAuthorized,
            };
        }
        // No state update necessary
        return null;
    }

    componentDidMount() {
        // console.log('Videos.componentDidMount');
        this.refresh();
    }

    componentDidUpdate(prevProps, prevState) {
        // console.log(`Videos.componentDidUpdate, playlistId=${this.state.playlistId}, prev=${prevState.playlistId}`, this.state);

        if (!this.state.isAuthorized) return;

        // At this point, we're in the "commit" phase, so it's safe to load the new data.
        // if (this.state.isAuthorized && this.state.playlistId && ((this.state.videos === null) || (this.state.videos.length === 0))) {

        if (this.state.playlistName === null) {
            // !!! only retrieve data if state.playlistName is empty; otherwise this will generate an endless loop.
            console.log('Videos.componentDidUpdate: call retrievePlaylistName');
            this.retrievePlaylistName();
        }

        if (
            !this.state.videosLoading &&
            this.state.playlistId &&
            this.state.videos === null
        ) {
            // !!! only retrieve data if state.videos is empty; otherwise this will generate an endless loop.
            console.log('Videos.componentDidUpdate: call retrieveVideos');
            this.retrieveVideos();
        }

        if (this.state.playlists === null) {
            // !!! only retrieve data if state.playlists is empty; otherwise this will generate an endless loop.
            console.log('Videos.componentDidUpdate: call retrievePlaylists');
            this.retrievePlaylists();
        }
    }

    storePlaylists = data => {
        // console.log("Videos.storePlayLists", data.items);
        if (!data) return;
        let list = data.items;
        list.sort(snippetTitleSort);
        this.setState({ playlists: list });
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

    updatePlaylistName = playlistName => {
        this.setState({ playlistName });
    };

    retrievePlaylistName = () => {
        if (!this.state.playlistId) {
            console.warn('state.playlistId is empty');
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
        // console.log(`Videos.retrieveVideos, playlistId=${this.state.playlistId}, pageToken=${nextPageToken}`);
        // console.log(`Videos.retrieveVideos set videosLoading=true`);
        this.setState({ videosLoading: true });
        executeRequest(
            buildPlaylistItemsRequest(this.state.playlistId, nextPageToken),
            data => this.storeVideos(data, nextPageToken)
        );
    };

    retrievePlaylists = () => {
        // console.log("Videos.retrievePlayLists");
        executeRequest(buildPlaylistsRequest(), this.storePlaylists);
    };

    removeFromPlaylistState = videoItemId => {
        // console.log("Videos.removeFromPlaylistState", videoItemId);
        let videos = this.state.videos;
        let i = videos.findIndex(function f(e) {
            return e.id === videoItemId;
        });
        // console.log("Videos.removeSuccess: video to delete: ", i, videos[i]);
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
        // console.log('Videos.remove', videoItemId);
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

    /**
     * Move the video to another playlist. The video will be removed from the current playlist.
     * @param videoItemId ID of the video-item in the current playlist
     * @param videoId ID of the video
     */
    move = (videoItemId, videoId, moveToPlaylistId) => {
        // console.log('Videos.move', videoItemId, videoId, moveToPlaylistId);

        if (!moveToPlaylistId) return;

        let insertRequest = buildApiRequest(
            'POST',
            '/youtube/v3/playlistItems',
            {
                part: 'snippet', //,
                // 'onBehalfOfContentOwner': ''
            },
            {
                'snippet.playlistId': moveToPlaylistId,
                'snippet.resourceId.kind': 'youtube#video',
                'snippet.resourceId.videoId': videoId, //,
                // 'snippet.position': ''
            }
        );

        let deleteRequest = buildApiRequest(
            'DELETE',
            '/youtube/v3/playlistItems',
            {
                id: videoItemId,
            }
        );

        //executeRequest(request, () => { this.insertSuccess(videoItemId) }, this.insertError);
        // executeRequest(request, () => { this.remove(videoItemId) }, this.insertError);

        // https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiclientbatch
        // https://developers.google.com/api-client-library/javascript/features/promises
        // gapi.client.Request.then(onFulfilled, onRejected, context)

        // response:
        //     An object containing information about the HTTP response.
        //     Name	        Type	            Description
        //     result	    *	                The JSON-parsed result. false if not JSON-parseable.
        //     body	        string	            The raw response string.
        //     headers	    object | undefined	The map of HTTP response headers.
        //     status	    number | undefined	HTTP status.
        //     statusText	string | undefined	HTTP status text.

        /*
        insertRequest
            .then(function(response) {    // onFulfilled handler:
                console.log("insertRequest promise onFulfilled handler", response);
                return deleteRequest
                //},
                // // onRejected handler:
                // function () {
                //     console.log("insertRequest onRejected handler");
                // },
                // // context:
                // this
            }
            // , function(reason) {
            //     console.log("insertRequest promise onRejected handler", reason);
            // }
            )
            .catch(function(error) {
                console.log("insert failed", error);
                throw error;    // let the error flow through the full chain.
            })
            .then(function(response) {
                console.log("deleteRequest promise onFulfilled handler", response);
            }, function(reason) {
                console.log("deleteRequest promise onRejected handler", reason);
            })
            .catch(function(error) {
                console.log("delete failed", error);
            });
*/
        let r = null;

        // console.log('calling insertRequest');
        insertRequest
            .then(function() {
                // console.log('calling deleteRequest');
                return deleteRequest.then(function() {
                    // console.log('deleteRequest.then');
                    r = 'OK';
                });
            })
            .catch(function(reason) {
                // console.log('move failed', JSON.stringify(reason));
                r = reason.result
                    ? reason.result.error.message
                    : 'unknow reason';
            });

        return r;

        // {
        //  "result":{
        //      "error":{
        //          "errors":[
        //              {"domain":"youtube.playlistItem","reason":"playlistIdRequired",
        //              "message":"Playlist id not specified."}],
        //          "code":400,
        //          "message":"Playlist id not specified."}},
        //          "body":"{\n \"error\": {\n  \"errors\": [\n   {\n    \"domain\": \"youtube.playlistItem\",\n    \"reason\": \"playlistIdRequired\",\n    \"message\": \"Playlist id not specified.\"\n   }\n  ],\n  \"code\": 400,\n  \"message\": \"Playlist id not specified.\"\n }\n}\n",
        //          "headers":{"date":"Thu, 17 Jan 2019 13:26:34 GMT","content-encoding":"gzip","server":"GSE","content-type":"application/json; charset=UTF-8","vary":"Origin, X-Origin","cache-control":"private, max-age=0","content-length":"150","expires":"Thu, 17 Jan 2019 13:26:34 GMT"},
        //          "status":400,
        //          "statusText":null}
    };

    movep = (videoItemId, videoId, moveToPlaylistId) => {
        // console.log('movep', videoItemId, videoId, moveToPlaylistId);
        // insertInPlaylist(videoId, moveToPlaylistId)
        //     .then(function(response) {
        //         console.log("movep.insertInPlaylist resovled", response);
        //     })
        //     .catch(function(error) {
        //         console.log("movep.insertInPlaylist rejected");
        //     });

        // let r = moveIntoPlaylist(videoItemId, videoId, moveToPlaylistId);
        // console.log("movep, r", r);

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

        // result:
        //     etag: ""XpPGQXPnxQJhLgs6enD_n8JR4Qk/-SMkaVE1qGHUDguCww7-fwlg5AY""
        // id: "UExfeDhNcFV5cHhlYksyX0NwSmItT3ROZVVfNTY4eWZCMi41MzJCQjBCNDIyRkJDN0VD"
        // kind: "youtube#playlistItem"
        // snippet:
        //     channelId: "UCE0q36_agQAeb4G3PXivkew"
        // channelTitle: "François Georgy"
        // description: "Now playing in select cities: gracejonesmovie.com↵↵This electrifying journey through the public and private worlds of pop culture mega-icon Grace Jones contrasts musical sequences with intimate personal footage, all the while brimming with Jones’s bold aesthetic. A larger-than-life entertainer, an androgynous glam-pop diva, an unpredictable media presence – Grace Jones is all these things and more. Sophie Fiennes’s documentary goes beyond the traditional music biography, offering a portrait as stylish and unconventional as its subject. Taking us home with her to Jamaica, into the studio with long-time collaborators Sly & Robbie, and backstage at gigs around the world, the film reveals Jones as lover, daughter, mother, and businesswoman. But the stage is the fixed point to which the film returns, with eye-popping performances of "Slave to the Rhythm," “Pull Up to the Bumper,” "Love is the Drug," and more. Jones herself has said watching the film “will be like seeing me almost naked” and, indeed, Fiennes’s treatment is every bit as definition-defying as its subject, untamed by either age or life itself."
        // playlistId: "PL_x8MpUypxebK2_CpJb-OtNeU_568yfB2"
        // publishedAt: "2019-01-18T12:35:59.000Z"
        // resourceId: {kind: "youtube#video", videoId: "ya7yeAXU_Cw"}
        // thumbnails: {default: {…}, medium: {…}, high: {…}, standard: {…}, maxres: {…}}
        // title: "Grace Jones: Bloodlight and Bami – Official U.S. Trailer"
        // __proto__: Object
        // __proto__: Object
        // status: 200
        // statusText: null
    };

    moveFailure = r => {
        console.log('moveFailure', r);
    };

    moveVisible = () => {
        console.log('Videos.moveVisible');

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
        // moveMultipleIntoPlaylist(videoItemIds, videoIds, this.state.moveToPlaylistId).then(this.moveSuccess, this.moveFailure);
        moveMultipleIntoPlaylist(
            videoItemIds,
            videoIds,
            this.state.moveToPlaylistId,
            this.moveSuccess,
            this.moveFailure
        );
        console.log('moveMultipleIntoPlaylist after');
    };

    setMoveToList = event => {
        // console.log("Videos.setMoveToList", event.target.value);
        this.setState({ moveToPlaylistId: event.target.value });
    };

    updateFilter = event => {
        // console.log("Videos.updateFilter", event.target.value);
        let f = event.target.value;
        this.setState({ filter: f });
    };

    refresh = (clearFilter = false) => {
        console.log('refresh');

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

        // console.log("Videos.render", videos);

        if (!isAuthorized) {
            return <div />;
        } else {
            if (videos) {
                let visibleVideos = videos.filter(video => video.snippet.title.toLowerCase().indexOf(filter.toLowerCase()) > -1);
                visibleVideos.sort(snippetTitleSort);
                return (
                    <div className="videos-main">
                        <div className="column">
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
                            {moveToPlaylistId && (
                                <div>
                                    <button onClick={this.moveVisible}>
                                        move visible to target playlist
                                    </button>
                                </div>
                            )}
                            <div className="filter">
                                filter:{' '}
                                <input
                                    type="text"
                                    defaultValue={filter}
                                    onKeyUp={this.updateFilter}
                                />
                            </div>
                            <div>
                                {// videos.filter((video) => video.snippet.title.toLowerCase().indexOf(filter.toLowerCase()) > -1).map((video, index) => {
                                visibleVideos.map((video, index) => {
                                    return (
                                        <div key={index}>
                                            <a href={`https://www.youtube.com/watch?v=${video.contentDetails.videoId}`} target="_blank" rel="noopener noreferrer">{video.snippet.title}</a>
                                            {' '}
                                            <button onClick={() => this.remove(video.id)}>remove</button>
                                            {moveToPlaylistId && (
                                                <button onClick={() => this.movep(video.id, video.contentDetails.videoId, moveToPlaylistId)}>move</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="column">
                            <h2>Videos in {playlistName} :</h2>
                            <h3>{videos.length} videos</h3>
                        </div>
                    </div>
                );
            } else {
                return <div>Retrieving the list of videos...</div>;
            }
        }
    }

    /*
{
  "kind": "youtube#playlistItem",
  "etag": "\"DuHzAJ-eQIiCIp7p4ldoVcVAOeY/1tCBTp6eGaB5-FomghShvhm_Vkc\"",
  "id": "UExfeDhNcFV5cHhlYlBlX1hZeWpKTUo1WVdlOTcyaU9Uci4yODlGNEE0NkRGMEEzMEQy",
  "snippet": {
    "publishedAt": "2018-06-19T10:55:25.000Z",
    "channelId": "UCE0q36_agQAeb4G3PXivkew",
    "title": "Urfaust - The Constellatory Practice (Full Album)",
    "description": "Country: The Netherlands | Year: 2018 | Genre: Atmospheric Doom/Black Metal\n\nLP & CD available here:\nhttp://www.van-records.de\n\nDigital Album available here:\nhttps://urfaust.bandcamp.com/album/the-constellatory-practice-2\n\n- Urfaust -\nWebshop: http://www.urfaust.bigcartel.com\nFacebook: https://www.facebook.com/urfaustofficial\nBandcamp: http://urfaust.bandcamp.com\nMetal Archives: http://www.metal-archives.com/bands/Urfaust/19596\n\n- Ván Records -\nWebsite: http://www.van-records.de\nFacebook: https://www.facebook.com/vanrecs\nBandcamp: http://vanrecords.bandcamp.com\nYouTube: https://www.youtube.com/vanrecords\nSoundcloud: https://soundcloud.com/v-n-records\n\nTracklist: \n1. Doctrine Of Spirit Obsession 00:00\n2. Behind The Veil Of The Trance Sleep 13:18\n3. A Course In Cosmic Meditation 21:06\n4. False Sensorial Impressions 25:40\n5. Trail Of The Conscience Of The Dead 31:42\n6. Eradication Through Hypnotic Suggestion 44:27\n\nThis video is for promotional use only!",
    "thumbnails": {
      "default": {
        "url": "https://i.ytimg.com/vi/ayCHct5hXPc/default.jpg",
        "width": 120,
        "height": 90
      },
      "medium": {
        "url": "https://i.ytimg.com/vi/ayCHct5hXPc/mqdefault.jpg",
        "width": 320,
        "height": 180
      },
      "high": {
        "url": "https://i.ytimg.com/vi/ayCHct5hXPc/hqdefault.jpg",
        "width": 480,
        "height": 360
      },
      "standard": {
        "url": "https://i.ytimg.com/vi/ayCHct5hXPc/sddefault.jpg",
        "width": 640,
        "height": 480
      },
      "maxres": {
        "url": "https://i.ytimg.com/vi/ayCHct5hXPc/maxresdefault.jpg",
        "width": 1280,
        "height": 720
      }
    },
    "channelTitle": "François Georgy",
    "playlistId": "PL_x8MpUypxebPe_XYyjJMJ5YWe972iOTr",
    "position": 1,
    "resourceId": {
      "kind": "youtube#video",
      "videoId": "ayCHct5hXPc"
    }
  },
  "contentDetails": {
    "videoId": "ayCHct5hXPc",
    "videoPublishedAt": "2018-05-04T10:59:02.000Z"
  }
}
    */
}

export default VideosMove;
