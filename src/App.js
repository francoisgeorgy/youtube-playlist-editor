import React, {Component} from 'react';
import './App.css';
import Playlists from "./components/Playlists";
import Videos from "./components/Videos";
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";

class App extends Component {

    //TODO: toggle authorized button once authorized

    state = {
        google_api : null,
        user: null,
        isAuthorized: false
    };

    setSigninStatus = () => {
        console.log("setSigninStatus", this.state.google_api);
        if (this.state.google_api) {
            let user = this.state.google_api.currentUser.get();
            console.log("setSigninStatus: user", user);
            let isAuthorized = user.hasGrantedScopes('https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtubepartner');
            this.setState({
                user: user,
                isAuthorized: isAuthorized
            });
        }
    };

    updateSigninStatus = () => {
        console.log("updateSigninStatus");
        this.setSigninStatus();
    };

    initClient = () => {

        console.log("initClient");

        window.gapi.client.init({
            'clientId': '1035406715321-fu4ktringpl82201dm2g9fm674akd203.apps.googleusercontent.com',
            'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
            'scope': 'https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtubepartner'
        }).then(() => {

            console.log("initClient: success");

            let inst = window.gapi.auth2.getAuthInstance();
            console.log("initClient: google_api", inst);

            // Listen for sign-in state changes
            inst.isSignedIn.listen(this.updateSigninStatus);

            // Handle initial sign-in state. (Determine if user is already signed in.)
            this.setSigninStatus();
            this.setState({ google_api: inst });

        }).catch(function (e) {
            console.warn("initClient: auth error: ", e);
        });
    };

    authorize = () => {
        console.log("authorize");
        this.state.google_api.signIn().then(
            (user) => {
                console.log("signIn return, user", user);
                let p = user.getBasicProfile();
                console.log("signIn return, user profile", p);
                let isAuthorized = user.hasGrantedScopes('https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtubepartner');
                console.log("signIn return, isAuthorized=" + isAuthorized);
                this.setState({
                    userProfile: p,
                    isAuthorized: isAuthorized
                });
            }
        );
    };

/*

user profile:

{
    "Eea":"10679130",
    "ig":"Firstname Lastname",
    "ofa":"Firstname",
    "wea":"Lastname",
    "Paa":"https://photo.jpg",
    "U3":"address@mail.com"
}
gapi.auth2.BasicProfile	You can retrieve the properties of gapi.auth2.BasicProfile with the following methods:
BasicProfile.getId()
BasicProfile.getName()
BasicProfile.getGivenName()
BasicProfile.getFamilyName()
BasicProfile.getImageUrl()
BasicProfile.getEmail()

*/

    componentDidMount() {
        console.log("gapi", window.gapi);
        // https://developers.google.com/api-client-library/javascript/reference/referencedocs
        window.gapi.load('client:auth2', this.initClient);
    }

/*
    shouldComponentUpdate(nextProps, nextState) {
        console.log("shouldComponentUpdate", nextState);
        return true;
    }
*/

    render() {
        console.log("render", this.state);

        const { isAuthorized, userProfile } = this.state;

        return (
            <Router>
                <div>
                    <div className="header">
                        Youtube Playlist Editor
                    {
                        isAuthorized ?
                            <div className="header-info">Authorized for {userProfile.getName()}</div>
                        :
                            <button onClick={this.authorize}>Authorize</button>
                    }
                    {isAuthorized && <Link className="header-link" to="/playlists">Playlists</Link>}
                    </div>
                    <div className="content">
                        {!isAuthorized &&
                            <div>
                                <p>You need to authorize the application to access your Youtube playlists.</p>
                                <p>Click the <button onClick={this.authorize}>Authorize</button> button to allow the access.</p>
                            </div>
                        }
                        <Switch>
                            {/*<Route exact={true} path="/" component={Home}/>*/}
                            {/*<Route path="/playlists" component={Playlists} />*/}
                            <Route path="/videos/:playlistid" render={(props) => (
                                <Videos {...props} isAuthorized={isAuthorized} />
                            )} />
                            <Route path='/playlists' render={(props) => (
                                <Playlists {...props} isAuthorized={isAuthorized} />
                            )} />
                        </Switch>
                    </div>
                </div>
            </Router>
        );
    }

}

export default App;
