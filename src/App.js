import React, { Component } from 'react';
import './App.css';
import Playlists from './components/Playlists';
import Videos from './components/Videos';
import { BrowserRouter as Router, Route, Link, Switch } from 'react-router-dom';
import Channels from './components/Channels';
import TwinVideos from "./components/TwinVideos";
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
        console.log('setSigninStatus', this.state.google_api);
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
        console.log('initClient');

        // console.log("* gapi.client.init");
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
                console.log('initClient: success');

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

        console.log('authorize');

        let auth = window.gapi.auth2.getAuthInstance();
        auth.grantOfflineAccess().then(function(resp) {
            // console.log("authorize grantOfflineAccess",resp);
            var auth_code = resp.code;
        });

        // console.log("* instance.signIn");
        this.state.google_api.signIn().then(user => {
            // console.log("signIn return, user", user);

            /*

                // https://stackoverflow.com/questions/32848870/googleuser-object-does-not-have-grantofflineaccess-method
                user.grantOfflineAccess({
                    authuser: user.getAuthResponse().session_state.extraQueryParams.authuser
                }).then(function(resp) {
                    console.log("grantOfflineAccess",resp);
                    var auth_code = resp.code;

                    // !!! Allow popup

                    // {code: "4/AABatlLl3D2rnSW7vIMcgAaua0uvaZ4oEvy5c2Q_3_NJpEDOk25y6zN8Pr7eBB8rsZ6wv0PQP_Rz_7ZABEccn4k"}
                });
*/

            // console.log("* user.getBasicProfile");
            let p = user.getBasicProfile();
            // console.log("signIn return, user profile", p);
            let isAuthorized = user.hasGrantedScopes(
                'https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtubepartner'
            );
            // console.log("signIn return, isAuthorized=" + isAuthorized);
            this.setState({
                user: user,
                userProfile: p,
                isAuthorized: isAuthorized,
            });
        });
    };

    grantAccess = () => {
        // console.log("grantAccess");

        let auth = window.gapi.auth2.getAuthInstance();
        // let user = auth.currentUser.get();

        // console.log("grantAccess", user);
        //
        // https://stackoverflow.com/questions/32848870/googleuser-object-does-not-have-grantofflineaccess-method
        auth.grantOfflineAccess({
            // authuser: user.getAuthResponse().session_state.extraQueryParams.authuser
            prompt: 'consent',
        }).then(function(resp) {
            console.log('grantOfflineAccess', resp);
            var auth_code = resp.code;

            // !!! Allow popup

            // {code: "4/AABatlLl3D2rnSW7vIMcgAaua0uvaZ4oEvy5c2Q_3_NJpEDOk25y6zN8Pr7eBB8rsZ6wv0PQP_Rz_7ZABEccn4k"}
        });
    };

    componentDidMount() {
        // console.log("gapi", window.gapi);
        // https://developers.google.com/api-client-library/javascript/reference/referencedocs

        // Here we use gapi.load('client:auth2', ...) to load both the client module (for dealing with API requests)
        // and the auth2 module (for dealing with OAuth 2.0) upfront. The gapi.client.init fuction lazily loads auth2
        // if it is needed. If you are sure your app needs auth, loading the two modules 'client:auth2' together
        // before you call gapi.client.init will save one script load request.

        // console.log("* gapi.load");
        window.gapi.load('client:auth2', this.initClient);
    }

    render() {
        // console.log("render", this.state);

        const { isAuthorized, userProfile } = this.state;

        return (
            <Router>
                <div>
                    <div className="header">
                        Youtube Playlist Editor
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
                        {isAuthorized && (
                            <Link className="header-link" to="/channels">
                                Channels
                            </Link>
                        )}
                        {isAuthorized && (
                            <Link className="header-link" to="/playlists">
                                Playlists
                            </Link>
                        )}
                        {isAuthorized && (
                            <Link className="header-link" to="/videos2">
                                Videos
                            </Link>
                        )}
                    </div>
                    <div className="content">
                        {!isAuthorized && (
                            <div>
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
                                path="/channels"
                                render={props => (
                                    <Channels
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
                                path="/videos/:playlistid"
                                render={props => (
                                    <Videos
                                        {...props}
                                        isAuthorized={isAuthorized}
                                    />
                                )}
                            />
                            <Route
                                path="/videos2"
                                render={props => (
                                    <TwinVideos
                                        {...props}
                                        isAuthorized={isAuthorized}
                                    />
                                )}
                            />
                        </Switch>
                    </div>
                </div>
            </Router>
        );
    }
}

export default App;
