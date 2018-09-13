import React, {Component} from "react";
import {buildChannelsRequest, executeRequest} from "../utils/gapi";
import { Link } from "react-router-dom";
import "./Channels.css";

/**
 * Display the list of channels of the authorized user.
 */
class Channels extends Component {

    constructor(props) {
        super(props);
        console.log("Channels.constructor", props);
        this.state = {
            isAuthorized: false,
            channels: null,
            filter: ''
        };
    }

    static getDerivedStateFromProps(props, state) {
        console.log("Channels.getDerivedStateFromProps", props);
        if (props.isAuthorized !== state.isAuthorized) {
            return {
                isAuthorized: props.isAuthorized
            };
        }

        // No state update necessary
        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        console.log("Channels.componentDidUpdate");
        // At this point, we're in the "commit" phase, so it's safe to load the new data.
        if (this.state.isAuthorized && this.state.channels === null) {
            // !!! only retrieve data if state.channels is empty; otherwise this will generate an endless loop.
            this.retrieve();
        }
    }

    store = (data) => {
        console.log("Channels.store");
        if (!data) return;
        this.setState({
            channels: data.items[0].contentDetails.relatedPlaylists
        });
    };

    retrieve = (nextPageToken) => {
        console.log("Channels.retrieve", nextPageToken);
        executeRequest(buildChannelsRequest(), this.store);
    };

    updateFilter = (event) => {
        console.log("Channels.updateFilter");
        if (event.keyCode === 27) {
            this.setState({ filter: '' });
        } else {
            this.setState({ filter: event.target.value });
        }
    };

    componentDidMount() {
        console.log("Channels.componentDidMount");
        this.retrieve();
    }

    render() {

        const { isAuthorized, channels, filter } = this.state;

        console.log("Channels render", channels);

        if (!isAuthorized) {
            return <div></div>
        } else {
            if (channels) {
                return (
                    <div>
                        <h2>list of channels</h2>
                        {/*<div className="filter">*/}
                            {/*filter: <input type="text" onKeyUp={this.updateFilter} />*/}
                        {/*</div>*/}
                        <div>
                            {
                                Object.keys(channels).map((name, index) => {
                                    return <div key={index} >
                                        <Link to={`/videos/${channels[name]}`}>{name}</Link>
                                    </div>
                                })
                            }
                        </div>
                    </div>
                )
            } else {
                return <div>Retrieving the channels...</div>
            }
        }

    }

}

export default Channels;
