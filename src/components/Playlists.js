import React, {Component} from "react";
import {buildApiRequest, buildPlaylistsRequest, executeRequest} from "../utils/gapi";
import { Link } from "react-router-dom";
import "./Playlists.css";

/**
 * Display the list of playlists of the authorized user.
 */
class Playlists extends Component {

    constructor(props) {
        super(props);
        console.log("Playlists.constructor", props);
        this.state = {
            isAuthorized: false,
            playlists: null,
            newPlaylist: null,
            filter: ''
        };
    }

    static getDerivedStateFromProps(props, state) {
        console.log("Playlists.getDerivedStateFromProps", props);
        if (props.isAuthorized !== state.isAuthorized) {
            return {
                isAuthorized: props.isAuthorized
            };
        }

        // No state update necessary
        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        console.log("Playlists.componentDidUpdate");
        // At this point, we're in the "commit" phase, so it's safe to load the new data.
        if (this.state.isAuthorized && this.state.playlists === null) {
            // !!! only retrieve data if state.playlists is empty; otherwise this will generate an endless loop.
            this.retrieve();
        }
    }

    newPlaylistName = (event) => {
        console.log("Playlists.newPlaylistName");
        this.setState({ newPlaylist: event.target.value });
    };

    createPlaylist = () => {
        if (!this.state.newPlaylist) return;
        let request = buildApiRequest(
            'POST',
            '/youtube/v3/playlists',
            {
                'part': 'snippet,status',
                'onBehalfOfContentOwner': ''
            }, {
                'snippet.title': this.state.newPlaylist,
                'snippet.description': '',
                'snippet.tags[]': '',
                'snippet.defaultLanguage': '',
                'status.privacyStatus': 'private'   // unlisted, private, public    https://developers.google.com/youtube/v3/docs/playlists#resource
            });
        //executeRequest(request, () => { this.insertSuccess(videoItemId) }, this.insertError);
        executeRequest(request, (resp) => { console.log("created playlist", resp); this.retrieve() }, this.createError);
    };

    store = (data) => {
        console.log("Playlists.store");
        if (!data) return;
        let list = data.items;
        list.sort(
            function(a, b) {
                return (a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase()) ? 1 : ((b.snippet.title.toLowerCase() > a.snippet.title.toLowerCase()) ? -1 : 0);
            }
        );
        this.setState({playlists: list});
    };

    retrieve = (nextPageToken) => {
        console.log("Playlists.retrieve", nextPageToken);
        executeRequest(buildPlaylistsRequest(nextPageToken), this.store);
    };

    updateFilter = (event) => {
        console.log("Playlists.updateFilter");
        if (event.keyCode === 27) {
            this.setState({ filter: '' });
        } else {
            this.setState({ filter: event.target.value });
        }
    };

    refresh = () => {
        this.retrieve();
    };

    componentDidMount() {
        console.log("Playlists.componentDidMount");
        this.retrieve();
    }

    /*
{
   "kind":"youtube#playlist",
   "etag":"\"DuHzAJ-eQIiCIp7p4ldoVcVAOeY/0v8-koTMYYwrjjH091gV-uVnD7w\"",
   "id":"PL_x8MpUypxebPqAdp-FT7MeViRdJyVlwR",
   "snippet":{
      "publishedAt":"2015-10-04T21:36:35.000Z",
      "channelId":"UCE0q36_agQAeb4G3PXivkew",
      "title":"trailers",
      "description":"",
      "thumbnails":{
         "default":{
            "url":"https://i.ytimg.com/vi/z5gxjvYDPJQ/default.jpg",
            "width":120,
            "height":90
         },
         "medium":{
            "url":"https://i.ytimg.com/vi/z5gxjvYDPJQ/mqdefault.jpg",
            "width":320,
            "height":180
         },
         "high":{
            "url":"https://i.ytimg.com/vi/z5gxjvYDPJQ/hqdefault.jpg",
            "width":480,
            "height":360
         }
      },
      "channelTitle":"François Georgy",
      "localized":{
         "title":"trailers",
         "description":""
      }
   },
   "contentDetails":{
      "itemCount":3
   }
}
    */

    render() {

        const { isAuthorized, playlists, newPlaylist, filter } = this.state;

        console.log("Playlists render");

        if (!isAuthorized) {
            return <div></div>
        } else {
            if (playlists) {
                return (
                    <div>
                        <h2>list of playlists</h2>
                        <button onClick={this.refresh}>refresh</button>
                        <div>
                            new playlist: <input type="text" value={newPlaylist} onChange={this.newPlaylistName} /> <button onClick={this.createPlaylist}>create</button>
                        </div>
                        <div className="filter">
                            filter: <input type="text" onKeyUp={this.updateFilter} />
                        </div>
                        <div>
                            {
                                playlists.filter((p) => p.snippet.title.indexOf(filter) > -1).map((playlist, index) => {
                                    // console.log(JSON.stringify(playlist));
                                    return <div key={index} >
                                            <Link to={`/videos/${playlist.id}`}>{playlist.snippet.title} ({playlist.contentDetails.itemCount} videos)</Link>
                                    </div>
                                    // return <div key={index}><a href={`#${playlist.id}`}>{playlist.snippet.title}</a> ({playlist.contentDetails.itemCount} videos)</div>
                                })
                            }
                        </div>
                    </div>
                )
            } else {
                return <div>Retrieving the playlists...</div>
            }
        }

    }

}

export default Playlists;
