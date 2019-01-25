import React, {Component, Fragment} from 'react';
import {
    buildApiRequest, buildChannelPlaylistsRequest, buildPlaylistItemsRequest,
    buildSubscriptionsRequest,
    executeRequest,
} from '../utils/gapi';
import { Link } from 'react-router-dom';
import './Subscriptions.css';
import {produce} from "immer";
import {snippetTitleSort} from "../utils/sorting";

/**
 * Display the list of subscriptions of the authorized user.
 */
class Subscriptions extends Component {

    constructor(props) {
        super(props);
        // console.log('Subscriptions.constructor', props);
        this.state = {
            isAuthorized: false,
            subscriptions: null,
            subscriptionsPlaylists: {},
            // newSubscription: '',
            filter: '',
        };
    }

    static getDerivedStateFromProps(props, state) {
        // console.log('Subscriptions.getDerivedStateFromProps', props);
        if (props.isAuthorized !== state.isAuthorized) {
            return {
                isAuthorized: props.isAuthorized,
            };
        }

        // No state update necessary
        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        // console.log('Subscriptions.componentDidUpdate');
        // At this point, we're in the "commit" phase, so it's safe to load the new data.
        if (this.state.isAuthorized && this.state.subscriptions === null) {
            // !!! only retrieve data if state.subscriptions is empty; otherwise this will generate an endless loop.
            this.retrieve();
        }
    }

    // newSubscriptionName = event => {
    //     console.log('Subscriptions.newSubscriptionName');
    //     this.setState({ newSubscription: event.target.value });
    // };

    // createSubscription = () => {
    //     if (!this.state.newSubscription) return;
    //     let request = buildApiRequest(
    //         'POST',
    //         '/youtube/v3/subscriptions',
    //         {
    //             part: 'snippet,status',
    //             onBehalfOfContentOwner: '',
    //         },
    //         {
    //             'snippet.title': this.state.newSubscription,
    //             'snippet.description': '',
    //             'snippet.tags[]': '',
    //             'snippet.defaultLanguage': '',
    //             'status.privacyStatus': 'private', // unlisted, private, public    https://developers.google.com/youtube/v3/docs/subscriptions#resource
    //         }
    //     );
    //     //executeRequest(request, () => { this.insertSuccess(videoItemId) }, this.insertError);
    //     executeRequest(
    //         request,
    //         resp => {
    //             console.log('created subscription', resp);
    //             this.retrieve();
    //         },
    //         this.createError
    //     );
    // };

    store = (data, currentToken) => {

        // console.log('Subscriptions.store', data);
        if (!data) return;

        let list = data.items;
        list.sort(snippetTitleSort);

        this.setState(
            produce(draft => {
                if (currentToken === undefined || !currentToken) {
                    draft.subscriptions = list;
                } else {
                    draft.subscriptions = [...draft.subscriptions, ...list]
                }
            })
        );

        if (data.nextPageToken) {
            // console.log('TwinVideos.storeVideos: get next page with token ' + data.nextPageToken);
            this.retrieve(data.nextPageToken);
        }

        // let list = data.items;
        // list.sort(function(a, b) {
        //     return a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase()
        //         ? 1
        //         : b.snippet.title.toLowerCase() > a.snippet.title.toLowerCase()
        //         ? -1
        //         : 0;
        // });
        // this.setState({ subscriptions: list });
    };

    retrieve = nextPageToken => {
        // console.log('Subscriptions.retrieve', nextPageToken);
        executeRequest(
            buildSubscriptionsRequest(nextPageToken),
            data => this.store(data, nextPageToken)
        );
    };

    storeChannelPlaylist = (channelId, data) => {
        // console.log("storeChannelPlaylist", data);
        const list = data.items;
        list.sort(snippetTitleSort);
        this.setState(
            produce(draft => {
                draft.subscriptionsPlaylists[channelId] = list;
            })
        );
    };

    retrieveChannelPlaylists = (channelId) => {
        // console.log(`retrieveChannelPlaylists(${channelId})`);
        executeRequest(
            buildChannelPlaylistsRequest(channelId),
            data => this.storeChannelPlaylist(channelId, data)
        );
    };

    updateFilter = event => {
        // console.log('Subscriptions.updateFilter');
        if (event.keyCode === 27) {
            this.setState({ filter: '' });
        } else {
            this.setState({ filter: event.target.value });
        }
    };

    clearFilter = () => {
        this.setState({filter: ''});
    };

    refresh = () => {
        this.retrieve();
    };

    componentDidMount() {
        // console.log('Subscriptions.componentDidMount');
        this.retrieve();
    }

    /*
{
   "kind":"youtube#subscription",
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
        const { isAuthorized, subscriptions, subscriptionsPlaylists, filter } = this.state;

        // console.log('Subscriptions render');

        const filt = filter.toLowerCase();

        if (!isAuthorized) {
            return <div />;
        } else {
            if (subscriptions) {
                return (
                    <div>
                        <h2>list of subscriptions</h2>
                        <h3>{subscriptions.length} subscriptions</h3>
                        <button onClick={this.refresh}>refresh</button>
                        <div className="filter">
                            filter:{' '}
                            <input type="text" onKeyUp={this.updateFilter} />
                            <button onClick={this.clearFilter}>clear filter</button>
                        </div>
                        <div className="subscriptions-list">
                            {subscriptions
                                .filter(p => (p.snippet.title.toLowerCase().indexOf(filt) > -1) || (p.snippet.description.toLowerCase().indexOf(filt) > -1))
                                .map((subscription, index) => {
                                    // console.log(subscription);
                                    const chanId = subscription.snippet.resourceId.channelId;
                                    return (
                                        <Fragment key={index}>
                                            <div>
                                                <Link to={`/videos/${subscription.id}`}>
                                                    {subscription.snippet.title}
                                                </Link>
                                                <a href={`https://www.youtube.com/channel/${chanId}`} target="_blank" rel="noopener noreferrer">open</a>
                                            </div>
                                            <div>
                                                {subscription.snippet.description}
                                                {' '}<button onClick={() => this.retrieveChannelPlaylists(chanId)}>show playlists</button>
                                                {subscriptionsPlaylists[chanId] &&
                                                <div className="channel-playlists">
                                                    {subscriptionsPlaylists[chanId].map(
                                                        (item, index) => {
                                                            return (
                                                                <a key={index} href={`https://www.youtube.com/playlist?list=${item.id}`} target="_blank" rel="noopener noreferrer">{item.snippet.title} ({item.contentDetails.itemCount})</a>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                                }
                                            </div>
                                        </Fragment>
                                    );
                                    // return <div key={index}><a href={`#${subscription.id}`}>{subscription.snippet.title}</a> ({subscription.contentDetails.itemCount} videos)</div>
                                })}
                        </div>
                    </div>
                );
            } else {
                return <div>Retrieving the subscriptions...</div>;
            }
        }
    }
}

export default Subscriptions;
