import React, {Component} from "react";
import {
    buildApiRequest,
    buildPlaylistsRequest,
    buildPlaylistItemsRequest,
    executeRequest,
    executeRequestsInBatch, buildPlaylistNameRequest, insertInPlaylist
} from "../utils/gapi";
import "./Videos.css";

/**
 * Display the list of videos for a playlist.
 */
class Videos extends Component {

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
            filter: ''
        };
    }

    static getDerivedStateFromProps(props, state) {
        // console.log("Videos.getDerivedStateFromProps", props);
        if (props.isAuthorized !== state.isAuthorized) {
            return {
                isAuthorized: props.isAuthorized
            };
        }
        // No state update necessary
        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        // console.log(`Videos.componentDidUpdate, playlistId=${this.state.playlistId}, prev=${prevState.playlistId}`, this.state);

        // At this point, we're in the "commit" phase, so it's safe to load the new data.
        // if (this.state.isAuthorized && this.state.playlistId && ((this.state.videos === null) || (this.state.videos.length === 0))) {

        if (this.state.isAuthorized && this.state.playlistName === null) {
            // !!! only retrieve data if state.playlistName is empty; otherwise this will generate an endless loop.
            this.retrievePlaylistName();
        }

        if (this.state.isAuthorized && this.state.playlistId && (this.state.videos === null)) {
            // !!! only retrieve data if state.videos is empty; otherwise this will generate an endless loop.
            this.retrieveVideos();
        }
        if (this.state.isAuthorized && this.state.playlists === null) {
            // !!! only retrieve data if state.playlists is empty; otherwise this will generate an endless loop.
            this.retrievePlaylists();
        }
    }

    storePlaylists = (data) => {
        // console.log("Videos.storePlayLists", data.items);
        if (!data) return;
        let list = data.items;
        list.sort(
            function(a, b) {
                return (a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase()) ? 1 : ((b.snippet.title.toLowerCase() > a.snippet.title.toLowerCase()) ? -1 : 0);
            }
        );
        this.setState({playlists: list});
    };

    storeVideos = (data, currentToken) => {

        // console.log("Videos.storeVideos", currentToken);

        if (!data) return;

        // console.log("Videos.storeVideos", data);

        let list = data.items;
        list.sort(
            function(a, b) {
                return (a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase()) ? 1 : ((b.snippet.title.toLowerCase() > a.snippet.title.toLowerCase()) ? -1 : 0);
            }
        );

        if (currentToken === undefined || !currentToken) {
            // console.log("Videos.storeVideos: set new videos list");
            this.setState({videos: list});
        } else {
            // console.log("Videos.storeVideos: append videos to current list");
            this.setState(prevState => ({
                videos: [...prevState.videos, ...list]
                // videos: prevState.videos.concat(list)
            }))
        }

        if (data.nextPageToken) {
            // console.log('Videos.storeVideos: get next page with token ' + data.nextPageToken);
            this.retrieveVideos(data.nextPageToken);
        }

    };

    updatePlaylistName = (playlistName) => {
        // console.log(playlistName);
        this.setState({playlistName})
    };

    retrievePlaylistName = () => {

        if (!this.state.playlistId) {
            console.warn("state.playlistId is empty");
            return;
        }

        let req = buildPlaylistNameRequest(this.state.playlistId);

        if (!req) {
            console.warn("req is null");
            return;
        }


        req.then(
            function(response) {
                // console.log("buildPlaylistNameRequest", response);
                try {
                    this.updatePlaylistName(response.result.items[0].snippet.title)
                } catch (e) {
                    if (e instanceof TypeError) {
                        console.log("buildPlaylistNameRequest incomplete response", e);
                    } else {
                        console.error("buildPlaylistNameRequest unexpected error", e);
                    }
                }
            },
            function() {    // onRejected handler
                console.warn("buildPlaylistNameRequest rejected");
            },
            this
        );

    };

    retrieveVideos = (nextPageToken) => {
        // console.log(`Videos.retrieveVideos, playlistId=${this.state.playlistId}, pageToken=${nextPageToken}`);
        executeRequest(buildPlaylistItemsRequest(this.state.playlistId, nextPageToken), (data) => this.storeVideos(data, nextPageToken));
    };

    retrievePlaylists = () => {
        // console.log("Videos.retrievePlayLists");
        executeRequest(buildPlaylistsRequest(), this.storePlaylists);
    };


    removeSuccess = (videoItemId) => {
        console.log("Videos.removeSuccess", videoItemId);
        let videos = this.state.videos;
        let i = videos.findIndex(function f(e) { return e.id === videoItemId; });
        console.log("Videos.removeSuccess: video to delete: ", i, videos[i]);
        videos.splice(i, 1);
        this.setState({ videos })
    };

    removeError = (error) => {
        console.log("Videos.removeError", error.code, error.message);
    };

    /**
     * Remove a video from the current playlist
     * @param videoItemId ID of the video-item in the current playlist
     */
    remove = (videoItemId) => {
        console.log("Videos.remove", videoItemId);
        if (!videoItemId) return;
        let request = buildApiRequest(
            'DELETE',
            '/youtube/v3/playlistItems',
            {
                'id': videoItemId
            });
        executeRequest(request, () => this.removeSuccess(videoItemId), this.removeError);
    };

    // insertSuccess = (videoItemId) => {
    //     console.log("");
    //     this.remove(videoItemId);
    // };

    createError = (error) => {
        console.log("Videos.insertError", error);
    };

    insertError = (error) => {
        console.log("Videos.insertError", error);
    };

    /**
     * Move the video to another playlist. The video will be removed from the current playlist.
     * @param videoItemId ID of the video-item in the current playlist
     * @param videoId ID of the video
     */
    move = (videoItemId, videoId, moveToPlaylistId) => {

        console.log("Videos.move", videoItemId, videoId, moveToPlaylistId);

        if (!moveToPlaylistId) return;

        let insertRequest = buildApiRequest(
            'POST',
            '/youtube/v3/playlistItems',
            {
                'part': 'snippet'   //,
                // 'onBehalfOfContentOwner': ''
            }, {
                'snippet.playlistId': moveToPlaylistId,
                'snippet.resourceId.kind': 'youtube#video',
                'snippet.resourceId.videoId': videoId   //,
                // 'snippet.position': ''
            });

        let deleteRequest = buildApiRequest(
            'DELETE',
            '/youtube/v3/playlistItemsX',
            {
                'id': videoItemId
            });

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
        console.log("calling insertRequest");
        insertRequest
            .then(function(){
                console.log("calling deleteRequest");
                return deleteRequest
                    .then(function(){
                        console.log("deleteRequest.then")
                    });
            })
            .catch(function(reason) {
                console.log("move failed", JSON.stringify(reason));
                console.log(reason.result ? reason.result.error.message : "unknow reason");
            });

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
        console.log("Videos.movep", videoItemId, videoId, moveToPlaylistId);
        insertInPlaylist(videoId, moveToPlaylistId)
            .then(function(response) {
                console.log("movep.insertInPlaylist resovled", response);
            })
            .catch(function(error) {
                console.log("movep.insertInPlaylist rejected");
            });
    };


    moveVisible = () => {
        console.log("Videos.moveVisible");
        /*
        let requests = [];
        this.state.videos.filter(
            (video) => video.snippet.title.indexOf(this.state.filter) > -1).map(video => {
                console.log("moveVisible", video.id, video.contentDetails.videoId, this.state.moveToPlaylistId);
                requests.push(buildApiRequest(
                    'POST',
                    '/youtube/v3/playlistItems',
                    {
                        'part': 'snippet',
                        'onBehalfOfContentOwner': ''
                    }, {
                        'snippet.playlistId': this.state.moveToPlaylistId,
                        'snippet.resourceId.kind': 'youtube#video',
                        'snippet.resourceId.videoId': video.contentDetails.videoId,
                        'snippet.position': ''
                    }));
            }
        );
        executeRequestsInBatch(requests, () => console.log("batch ok"), () => console.log("batch fail"));
        */
    };

    setMoveToList = (event) => {
        // console.log("Videos.setMoveToList", event.target.value);
        this.setState({ moveToPlaylistId: event.target.value });
    };

    updateFilter = (event) => {
        // console.log("Videos.updateFilter", event.target.value);
        let f = event.target.value;
        this.setState({ filter: f });
    };

    refresh = () => {
        this.retrievePlaylistName();
        this.retrieveVideos();
        this.retrievePlaylists();
    };


    componentDidMount() {
        console.log("Videos.componentDidMount");
        this.refresh();
    }


    render() {

        const { isAuthorized, playlistName, videos, playlists, moveToPlaylistId, filter } = this.state;

        // console.log("Videos.render");

        if (!isAuthorized) {
            return <div></div>
        } else {
            if (videos) {
                return (
                    <div className="videos">
                        <h2>Videos in {playlistName} :</h2>
                        <h3>{videos.length} videos</h3>
                        <button onClick={this.refresh}>refresh</button>
                        <div className="playlist-selector">
                            target playlist:
                            {
                                playlists &&
                                <select onChange={this.setMoveToList}>
                                    <option value="">select list to move to</option>
                                {playlists.map((p, i) => (
                                    <option key={i} value={p.id}>
                                        {p.snippet.title}
                                    </option>
                                ))}
                                </select>
                            }
                        </div>
                        <div>
                            <button onClick={this.moveVisible}>move visible to target playlist</button>
                        </div>
                        <div className="filter">
                            filter: <input type="text" onKeyUp={this.updateFilter} />
                        </div>
                        <div>
                            {
                                videos.filter((video) => video.snippet.title.indexOf(filter) > -1).map((video, index) => {
                                    return (
                                        <div key={index}>
                                            {video.snippet.title}
                                            <button onClick={() => this.remove(video.id)}>remove</button>
                                            {moveToPlaylistId && <button onClick={() => this.move(video.id, video.contentDetails.videoId, moveToPlaylistId)}>move</button>}
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                )
            } else {
                return <div>Retrieving the list of videos...</div>
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

export default Videos;
