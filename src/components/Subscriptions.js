import React, {Component, Fragment} from 'react';
import {
    buildChannelPlaylistsRequest,
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
        this.state = {
            isAuthorized: false,
            subscriptions: null,
            subscriptionsPlaylists: {},
            filter: '',
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

    componentDidUpdate(prevProps, prevState) {
        if (this.state.isAuthorized && this.state.subscriptions === null) {
            // Only retrieve data if state.subscriptions is empty; otherwise this will generate an endless loop.
            this.retrieve();
        }
    }

    store = (data, currentToken) => {

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
            this.retrieve(data.nextPageToken);
        }
    };

    retrieve = nextPageToken => {
        executeRequest(
            buildSubscriptionsRequest(nextPageToken),
            data => this.store(data, nextPageToken)
        );
    };

    storeChannelPlaylist = (channelId, data) => {
        const list = data.items;
        list.sort(snippetTitleSort);
        this.setState(
            produce(draft => {
                draft.subscriptionsPlaylists[channelId] = list;
            })
        );
    };

    retrieveChannelPlaylists = (channelId) => {
        executeRequest(
            buildChannelPlaylistsRequest(channelId),
            data => this.storeChannelPlaylist(channelId, data)
        );
    };

    updateFilter = event => {
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
        if (this.state.isAuthorized) this.retrieve();
    }

    render() {
        const { isAuthorized, subscriptions, subscriptionsPlaylists, filter } = this.state;

        const filt = filter.toLowerCase();

        if (!isAuthorized) {
            return null;
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
                                    const chanId = subscription.snippet.resourceId.channelId;
                                    return (
                                        <Fragment key={index}>
                                            <div>
                                                <a href={`https://www.youtube.com/channel/${chanId}`} target="_blank" rel="noopener noreferrer"> <i className="fas fa-external-link-alt"></i></a>
                                                <Link to={`/videos/${subscription.id}`}>
                                                    {subscription.snippet.title}
                                                </Link>
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
