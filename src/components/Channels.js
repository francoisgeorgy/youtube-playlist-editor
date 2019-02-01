import React, { Component } from 'react';
import { buildChannelsRequest, executeRequest } from '../utils/gapi';
import { Link } from 'react-router-dom';
import './Channels.css';

/**
 * Display the list of channels of the authorized user.
 */
class Channels extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isAuthorized: false,
            channels: null
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
        // console.log('Channels.componentDidUpdate');
        if (this.state.isAuthorized && this.state.channels === null) {
            this.retrieve();
        }
    }

    store = data => {
        if (!data) return;
        this.setState({
            channels: data.items[0].contentDetails.relatedPlaylists,
        });
    };

    retrieve = nextPageToken => {
        executeRequest(buildChannelsRequest(), this.store);
    };

    componentDidMount() {
        if (this.state.isAuthorized) this.retrieve();
    }

    render() {
        const { isAuthorized, channels } = this.state;

        if (!isAuthorized) {
            return null;
        } else {
            if (channels) {
                return (
                    <div>
                        <h2>list of channels</h2>
                        <div>
                            {Object.keys(channels).map((name, index) => {
                                return (
                                    <div key={index}>
                                        <Link to={`/videos/${channels[name]}`}>
                                            {name}
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            } else {
                return <div>Retrieving the channels...</div>;
            }
        }
    }
}

export default Channels;
