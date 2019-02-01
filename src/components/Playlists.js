import React, { Component } from 'react';
import {
    buildApiRequest,
    buildPlaylistsRequest,
    executeRequest,
} from '../utils/gapi';
import { Link } from 'react-router-dom';
import './Playlists.css';
import {snippetTitleSort} from "../utils/sorting";

/**
 * Display the list of playlists of the authorized user.
 */
class Playlists extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isAuthorized: false,
            playlists: null,
            newPlaylist: '',
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
        if (this.state.isAuthorized && this.state.playlists === null) {
            // Only retrieve data if state.playlists is empty; otherwise this will generate an endless loop.
            this.retrieve();
        }
    }

    newPlaylistName = event => {
        this.setState({ newPlaylist: event.target.value });
    };

    createPlaylist = () => {
        if (!this.state.newPlaylist) return;
        let request = buildApiRequest(
            'POST',
            '/youtube/v3/playlists',
            {
                part: 'snippet,status',
                onBehalfOfContentOwner: '',
            },
            {
                'snippet.title': this.state.newPlaylist,
                'snippet.description': '',
                'snippet.tags[]': '',
                'snippet.defaultLanguage': '',
                'status.privacyStatus': 'private', // unlisted, private, public    https://developers.google.com/youtube/v3/docs/playlists#resource
            }
        );
        executeRequest(
            request,
            resp => {
                this.retrieve();
            },
            this.createError
        );
    };


    store = (data, currentToken) => {
        if (!data) return;

        let list = data.items;
        list.sort(snippetTitleSort);

        if (currentToken === undefined || !currentToken) {
            this.setState({ playlists: list });
        } else {
            this.setState(prevState => ({ playlists: [...prevState.playlists, ...list] }));
        }

        if (data.nextPageToken) {
            this.retrieve(data.nextPageToken);
        }

    };

    retrieve = nextPageToken => {
        executeRequest(buildPlaylistsRequest(nextPageToken),
            data => this.store(data, nextPageToken));
    };

    updateFilter = event => {
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
        if (this.state.isAuthorized) this.retrieve();
    }

    render() {
        const { isAuthorized, playlists, newPlaylist, filter } = this.state;

        if (!isAuthorized) {
            return null;
        } else {
            if (playlists) {
                return (
                    <div>
                        <h2>list of playlists</h2>
                        <button onClick={this.refresh}>refresh</button>
                        <h3>{playlists.length} playlists</h3>
                        <div>
                            new playlist:{' '}
                            <input
                                type="text"
                                value={newPlaylist}
                                onChange={this.newPlaylistName}
                            />{' '}
                            <button onClick={this.createPlaylist}>
                                create
                            </button>
                        </div>
                        <div className="filter">
                            filter:{' '}
                            <input type="text" onKeyUp={this.updateFilter} />
                        </div>
                        <div>
                            {playlists
                                .filter(
                                    p =>
                                        p.snippet.title
                                            .toLowerCase()
                                            .indexOf(filter.toLowerCase()) > -1
                                )
                                .map((playlist, index) => {
                                    // console.log(JSON.stringify(playlist));
                                    return (
                                        <div key={index}>
                                            <Link to={`/videos/${playlist.id}`}>
                                                {playlist.snippet.title} (
                                                {
                                                    playlist.contentDetails
                                                        .itemCount
                                                }{' '}
                                                videos)
                                            </Link>
                                        </div>
                                    );
                                    // return <div key={index}><a href={`#${playlist.id}`}>{playlist.snippet.title}</a> ({playlist.contentDetails.itemCount} videos)</div>
                                })}
                        </div>
                    </div>
                );
            } else {
                return <div>Retrieving the playlists...</div>;
            }
        }
    }
}

export default Playlists;
