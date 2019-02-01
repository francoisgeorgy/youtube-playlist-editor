import React, { Component } from 'react';
import './App.css';
import Playlists from './components/Playlists';
import Videos from './components/Videos';
import { BrowserRouter as Router, Route, Link, Switch } from 'react-router-dom';
import Channels from './components/Channels';
import Subscriptions from "./components/Subscriptions";
import PlaylistsVideos from "./components/PlaylistsVideos";
import VideosVideos from "./components/VideosVideos";
// import { library } from '@fortawesome/fontawesome-svg-core'
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
//
// library.add(faAngleDoubleRight);


/*
    gapi.load
    gapi.client.init
    gapi.auth2.getAuthInstance
    <authorize button>
    instance.signIn
    user.getBasicProfile
*/

class App extends Component {
    //TODO: toggle authorized button once authorized

    state = {
        google_api: null,
        user: null,
        isAuthorized: false,
    };

    /**
     * Called on update of sign-in status
     */
    setSigninStatus = () => {
        // console.log('setSigninStatus', this.state.google_api);
        if (this.state.google_api) {
            // console.log("* instance.currentUser.get()");
            let user = this.state.google_api.currentUser.get();

            // console.log("setSigninStatus: user", user);

            let isAuthorized = user.hasGrantedScopes(
                'https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtubepartner'
            );
            this.setState({
                user: user,
                isAuthorized: isAuthorized,
            });
        }
    };

    updateSigninStatus = () => {
        // console.log("updateSigninStatus");
        this.setSigninStatus();
    };

    initClient = () => {
        // console.log('initClient');

        window.gapi.client
            .init({
                clientId:
                    '1035406715321-fu4ktringpl82201dm2g9fm674akd203.apps.googleusercontent.com',
                discoveryDocs: [
                    'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest',
                ],
                scope:
                    'https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtubepartner', //,
                // 'access_type': 'offline'
            })
            .then(() => {
                // console.log('initClient: success');

                // console.log("* gapi.auth2.getAuthInstance");
                let inst = window.gapi.auth2.getAuthInstance(); // https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiauth2getauthinstance
                // console.log("initClient: google_api", inst);

                // Listen for sign-in state changes
                inst.isSignedIn.listen(this.updateSigninStatus);

                // Handle initial sign-in state. (Determine if user is already signed in.)
                this.setSigninStatus();
                this.setState({ google_api: inst });
            })
            .catch(function(e) {
                console.warn('initClient: auth error: ', e);
            });
    };

    authorize = () => {

        // console.log('authorize');

        let auth = window.gapi.auth2.getAuthInstance();
/*
        auth.grantOfflineAccess().then(function(resp) {
            // console.log("authorize grantOfflineAccess",resp);
            // var auth_code = resp.code;
        });
*/
        auth.grantOfflineAccess();

        this.state.google_api.signIn().then(user => {
            let p = user.getBasicProfile();
            let isAuthorized = user.hasGrantedScopes('https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtubepartner');
            this.setState({
                user: user,
                userProfile: p,
                isAuthorized: isAuthorized,
            });
        });
    };

    grantAccess = () => {

        let auth = window.gapi.auth2.getAuthInstance();

        // https://stackoverflow.com/questions/32848870/googleuser-object-does-not-have-grantofflineaccess-method
/*
        auth.grantOfflineAccess({
            // authuser: user.getAuthResponse().session_state.extraQueryParams.authuser
            prompt: 'consent',
        }).then(function(resp) {
            var auth_code = resp.code;
            // !!! Allow popup
        });
*/
        auth.grantOfflineAccess();
    };

    componentDidMount() {
        // https://developers.google.com/api-client-library/javascript/reference/referencedocs

        // Here we use gapi.load('client:auth2', ...) to load both the client module (for dealing with API requests)
        // and the auth2 module (for dealing with OAuth 2.0) upfront. The gapi.client.init fuction lazily loads auth2
        // if it is needed. If you are sure your app needs auth, loading the two modules 'client:auth2' together
        // before you call gapi.client.init will save one script load request.
        window.gapi.load('client:auth2', this.initClient);
    }

    render() {
        const { isAuthorized, userProfile } = this.state;

        return (
            <Router>
                <div className="App">
                    <div className="header">
                        Youtube Playlist Editor
                        {isAuthorized && <div className="header-info">
                            Authorized for {userProfile.getName()}
                        </div>}
{/*
                        <button onClick={this.grantAccess}>Grant access</button>
                        {isAuthorized ? (
                            <div className="header-info">
                                Authorized for {userProfile.getName()}
                            </div>
                        ) : (
                            <span>
                                <button onClick={this.authorize}>
                                    Authorize
                                </button>
                            </span>
                        )}
*/}
                        {isAuthorized && (
                            <Link className="header-link" to="/playlists-videos">
                                Playlists-Videos
                            </Link>
                        )}
                        {isAuthorized && (
                            <Link className="header-link" to="/videos-videos">
                                Videos-Videos
                            </Link>
                        )}
                        {isAuthorized && (
                            <Link className="header-link" to="/playlists">
                                Playlists
                            </Link>
                        )}
                        {isAuthorized && (
                            <Link className="header-link" to="/subscriptions">
                                Subscriptions
                            </Link>
                        )}
                        {isAuthorized && (
                            <Link className="header-link" to="/channels">
                                Channels
                            </Link>
                        )}
                    </div>
                    {!isAuthorized && (
                        <div className="authorization">
                            <p>
                                You need to authorize the application to
                                access your Youtube playlists.
                            </p>
                            <p>
                                Click the{' '}
                                <button onClick={this.authorize}>
                                    Authorize
                                </button>{' '}
                                button to allow the access.
                            </p>
                        </div>
                    )}
                    <Switch>
                        {/*<Route exact={true} path="/" component={Home}/>*/}
                        {/*<Route path="/playlists" component={Playlists} />*/}
                        <Route
                            path="/playlists-videos"
                            render={props => (
                                <PlaylistsVideos
                                    {...props}
                                    isAuthorized={isAuthorized}
                                />
                            )}
                        />
                        <Route
                            path="/videos-videos"
                            render={props => (
                                <VideosVideos
                                    {...props}
                                    isAuthorized={isAuthorized}
                                />
                            )}
                        />
                        <Route
                            path="/playlists"
                            render={props => (
                                <Playlists
                                    {...props}
                                    isAuthorized={isAuthorized}
                                />
                            )}
                        />
                        <Route
                            path="/subscriptions"
                            render={props => (
                                <Subscriptions
                                    {...props}
                                    isAuthorized={isAuthorized}
                                />
                            )}
                        />
                        <Route
                            path="/videos/:playlistid"
                            render={props => (
                                <Videos
                                    {...props}
                                    isAuthorized={isAuthorized}
                                />
                            )}
                        />
                        <Route
                            path="/channels"
                            render={props => (
                                <Channels
                                    {...props}
                                    isAuthorized={isAuthorized}
                                />
                            )}
                        />
                    </Switch>
                </div>
            </Router>
        );
    }
}

export default App;
