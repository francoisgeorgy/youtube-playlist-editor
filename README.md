# Resources

## Google API :
 
### Generic 
 
- https://developers.google.com/api-client-library/javascript/reference/referencedocs
- https://developers.google.com/api-client-library/javascript/samples/samples

#### API Scopes

- https://developers.google.com/identity/protocols/googlescopes#youtubev3

    https://www.googleapis.com/auth/youtube	Manage your YouTube account
    https://www.googleapis.com/auth/youtube.force-ssl	Manage your YouTube account
    https://www.googleapis.com/auth/youtube.readonly	View your YouTube account
    https://www.googleapis.com/auth/youtube.upload	Manage your YouTube videos
    https://www.googleapis.com/auth/youtubepartner	View and manage your assets and associated content on YouTube
    https://www.googleapis.com/auth/youtubepartner-channel-audit	View private information of your YouTube channel relevant during the audit process with a YouTube partner


### Youtube API

- https://developers.google.com/youtube/v3/docs/
- https://developers.google.com/youtube/v3/sample_requests
- https://developers.google.com/apis-explorer/#p/youtube/v3/
- https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.playlistItems.list?part=contentDetails&playlistId=WL&_h=1&

- https://github.com/youtube/api-samples/tree/master/javascript

#### Watch Later playlist:


https://developers.google.com/youtube/v3/revision_history#september-15-2016 :
 
The channel resource's contentDetails.relatedPlaylists.watchHistory and contentDetails.relatedPlaylists.watchLater 
properties now contain values of HL and WL, respectively, for all channels.

To be clear, these properties are only visible to an authorized user retrieving data about the user's own channel. 
The properties always contain the values HL and WL, even for an authorized user retrieving data about the user's own channel. 
Thus, the watch history and watch later playlist IDs cannot be retrieved via the API.

In addition, requests to retrieve playlist details (playlists.list) or playlist items (playlistItems.list) for a 
channel's watch history or watch later playlist now return empty lists. This behavior is true for the new values, HL and WL,
 as well as for any watch history or watch later playlist IDs that your API Client may have already stored. 
 
#### Batch processing

https://github.com/google/google-api-javascript-client/issues/408

