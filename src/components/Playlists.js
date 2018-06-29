import React, {Component} from "react";
import {buildApiRequest, executeRequest} from "../utils/gapi";
import "./Playlists.css";

/**
 * Display the list of playlists of the authorized user.
 */
class Playlists extends Component {

    state = {
        playlists: null
    };

    store = (data) => {
        console.log("displayPlaylists", data.items);
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
        console.log("retrievePlaylists", nextPageToken);
        let request = buildApiRequest(
            this.state.google_api,
            'GET',
            '/youtube/v3/playlists',
            {
                // 'channelId': 'UCE0q36_agQAeb4G3PXivkew',
                'mine': 'true',
                'maxResults': '50',
                'part': 'snippet,contentDetails',
                'onBehalfOfContentOwner': '',
                'onBehalfOfContentOwnerChannel': '',
                'pageToken': nextPageToken
            });
        executeRequest(request, this.store);
    };

    componentDidMount() {
        console.log("Playlists: componentDidMount");
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

        const { playlists } = this.state;

        console.log("Playlists render", playlists);

        if (playlists) {
            return (
                <div>
                    <h2>list of playlists</h2>
                    <div>
                        {
                            playlists.map((playlist, index) => {
                                console.log(JSON.stringify(playlist));
                                return <div key={index}><a href={`#${playlist.id}`}>{playlist.snippet.title}</a> ({playlist.contentDetails.itemCount} videos)</div>
                            })
                        }
                    </div>
                </div>
            )
        } else {
            return <div>Retrieving the list of playlists...</div>
        }

    }

}

export default Playlists;
