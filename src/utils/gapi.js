export function createResource(properties) {
    // console.log("createResource");
    let resource = {};
    let normalizedProps = properties;
    for (let p in properties) {
        let value = properties[p];
        if (p && p.substr(-2, 2) === '[]') {
            let adjustedName = p.replace('[]', '');
            if (value) {
                normalizedProps[adjustedName] = value.split(',');
            }
            delete normalizedProps[p];
        }
    }
    for (let p in normalizedProps) {
        // Leave properties that don't have values out of inserted resource.
        if (normalizedProps.hasOwnProperty(p) && normalizedProps[p]) {
            let propArray = p.split('.');
            let ref = resource;
            for (let pa = 0; pa < propArray.length; pa++) {
                let key = propArray[pa];
                if (pa === propArray.length - 1) {
                    ref[key] = normalizedProps[p];
                } else {
                    ref = ref[key] = ref[key] || {};
                }
            }
        }
    }
    return resource;
}

export function removeEmptyParams(params) {
    // console.log("removeEmptyParams");
    for (let p in params) {
        if (
            params.hasOwnProperty(p) &&
            (!params[p] || params[p] === 'undefined')
        ) {
            delete params[p];
        }
    }
    return params;
}

export function buildApiRequest(requestMethod, path, params, properties) {
    // console.log("buildApiRequest", requestMethod, path, params, properties);

    if (window.gapi.client === undefined || window.gapi.client === null) {
        console.log('buildApiRequest window.gapi.client is undefined or null');
        return null;
    }

    params = removeEmptyParams(params);

    // console.log("buildApiRequest params", params);

    let request;
    if (properties) {
        let resource = createResource(properties);
        console.log('buildApiRequest resource', resource);
        request = window.gapi.client.request({
            body: resource,
            method: requestMethod,
            path: path,
            params: params,
        });
    } else {
        request = window.gapi.client.request({
            method: requestMethod,
            path: path,
            params: params,
        });
    }
    return request;
}

export function buildPlaylistNameRequest(id) {
    // console.log("buildPlaylistsRequests", pageToken);
    // console.log('GET /youtube/v3/playlists');

    /*
        console.log("buildPlaylistNameRequest", id, {
            'id': id,
            // 'mine': 'true',
            // 'maxResults': '50',
            'part': 'snippet,contentDetails'    //,
            // 'onBehalfOfContentOwner': '',
            // 'onBehalfOfContentOwnerChannel': '',
            // 'pageToken': pageToken
        });
*/

    return buildApiRequest('GET', '/youtube/v3/playlists', {
        id: id,
        // 'mine': 'true',
        // 'maxResults': '50',
        part: 'snippet,contentDetails', //,
        // 'onBehalfOfContentOwner': '',
        // 'onBehalfOfContentOwnerChannel': '',
        // 'pageToken': pageToken
    });
}

export function buildPlaylistsRequest(pageToken) {
    // console.log("buildPlaylistsRequests", pageToken);
    // console.log('GET /youtube/v3/playlists');
    return buildApiRequest('GET', '/youtube/v3/playlists', {
        mine: 'true',
        maxResults: '50',
        part: 'snippet,contentDetails',
        onBehalfOfContentOwner: '',
        onBehalfOfContentOwnerChannel: '',
        pageToken: pageToken,
    });
}

export function buildPlaylistItemsRequest(playlistId, pageToken) {
    // console.log('GET /youtube/v3/playlistItems');
    return buildApiRequest('GET', '/youtube/v3/playlistItems', {
        maxResults: '50',
        part: 'snippet,contentDetails',
        playlistId: playlistId,
        pageToken: pageToken,
    });
}

export function buildChannelsRequest() {
    // console.log("buildChannelsRequests", pageToken);
    return buildApiRequest('GET', '/youtube/v3/channels', {
        mine: 'true',
        part: 'contentDetails',
    });
}

export function insertInPlaylist(videoId, moveToPlaylistId) {
    let insertRequest = buildApiRequest(
        'POST',
        '/youtube/v3/playlistItems',
        {
            part: 'snippet', //,
        },
        {
            'snippet.playlistId': moveToPlaylistId,
            'snippet.resourceId.kind': 'youtube#video',
            'snippet.resourceId.videoId': videoId,
        }
    );

    return new Promise(function(resolve, reject) {
        insertRequest
            .then(function(response) {
                resolve(response.result);
            })
            .catch(function() {
                reject();
            });
    });
}

export function executeRequest(request, callback, callbackError) {

    // console.log("executeRequest begin");

    if (request === undefined || request === null) {
        console.log('executeRequest request is undefined or null');
        return;
    }
    /*
        request.execute(function(data) {
            // console.log(data);
            if (data) {
                if (data.error) {
                    console.warn(`${data.error.code} ${data.error.message}`);
                    if (callbackError) {
                        callbackError(data.error);
                    }
                } else {
                    // console.log('executeRequest calling callback');
                    if (callback) callback(data);
                    // if (data.nextPageToken) {
                    //     console.log('get next page', data.nextPageToken);
                    //     defineRequest(data.nextPageToken);
                    // }
                }
            } else {
                if (callback) callback();
            }
        });
*/

    // https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiclientbatch
    // https://developers.google.com/api-client-library/javascript/features/promises
    // gapi.client.Request.then(onFulfilled, onRejected, context)

    request.then(
        // onFulfilled handler:
        function(response) {
            // response:
            //     An object containing information about the HTTP response.
            //     Name	        Type	            Description
            //     result	    *	                The JSON-parsed result. false if not JSON-parseable.
            //     body	        string	            The raw response string.
            //     headers	    object | undefined	The map of HTTP response headers.
            //     status	    number | undefined	HTTP status.
            //     statusText	string | undefined	HTTP status text.

            // console.log("executeRequest promise onFulfilled handler", response);

            if (callback) callback(response.result);

            // if (data.error) {
            //     console.warn(`${data.error.code} ${data.error.message}`);
            //     if (callbackError) {
            //         callbackError(data.error);
            //     }
            // } else {
            //     // console.log('executeRequest calling callback');
            //     if (callback) callback(data);
            //     // if (data.nextPageToken) {
            //     //     console.log('get next page', data.nextPageToken);
            //     //     defineRequest(data.nextPageToken);
            //     // }
            // }
        }
    );

    // console.log("executeRequest end");
}

/**
 * Move the video to another playlist. The video will be removed from the current playlist.
 * @param videoItemId ID of the video-item in the current playlist
 * @param videoId ID of the video
 */
export function moveIntoPlaylist(videoItemId, videoId, moveToPlaylistId) {
    console.log('moveIntoPlaylist', videoItemId, videoId, moveToPlaylistId);

    if (!moveToPlaylistId) return;

    let insertRequest = buildApiRequest(
        'POST',
        '/youtube/v3/playlistItems',
        {
            part: 'snippet',
        },
        {
            'snippet.playlistId': moveToPlaylistId,
            'snippet.resourceId.kind': 'youtube#video',
            'snippet.resourceId.videoId': videoId,
        }
    );

    let deleteRequest = buildApiRequest('DELETE', '/youtube/v3/playlistItems', {
        id: videoItemId,
    });

    return insertRequest.then(insertResponse => {
        console.log(
            'moveIntoPlaylist: calling deleteRequest insertResponse',
            insertResponse
        );
        return deleteRequest.then(deleteResult => {
            console.log(
                'moveIntoPlaylist: deleteRequest.then, deleteResult',
                deleteResult
            );
            return deleteResult;
        });
    });

}


export function copyMultipleIntoPlaylist(
    videoItemIds,
    videoIds,
    moveToPlaylistId,
    insertSuccessCallback,
    failureCallback) {

    console.log('copyMultipleIntoPlaylist', videoItemIds, videoIds, moveToPlaylistId);

    if (!moveToPlaylistId) return;

    let insertRequests = [];
    for (let i = 0; i < videoIds.length; i++) {
        insertRequests.push(
            buildApiRequest(
                'POST',
                '/youtube/v3/playlistItems',
                {
                    part: 'snippet',
                },
                {
                    'snippet.playlistId': moveToPlaylistId,
                    'snippet.resourceId.kind': 'youtube#video',
                    'snippet.resourceId.videoId': videoIds[i],
                }
            )
        );
    }

    // Start off with a promise that always resolves
    let sequence = Promise.resolve();

    for (let i = 0; i < insertRequests.length; i++) {
        sequence = sequence
            .then(() => insertRequests[i])
            .then(t => {
                insertSuccessCallback({
                    data: t,
                    videoId: `${videoIds[i]}`,
                    videoItemId: `${videoItemIds[i]}`,
                });
            });
    }

}


export function moveMultipleIntoPlaylist(
    videoItemIds,
    videoIds,
    moveToPlaylistId,
    insertSuccessCallback,
    deleteSuccessCallback,
    failureCallback) {

    console.log('moveMultipleIntoPlaylist', videoItemIds, videoIds, moveToPlaylistId);

    if (!moveToPlaylistId) return;

    let insertRequests = [];
    for (let i = 0; i < videoIds.length; i++) {
        insertRequests.push(
            buildApiRequest(
                'POST',
                '/youtube/v3/playlistItems',
                {
                    part: 'snippet',
                },
                {
                    'snippet.playlistId': moveToPlaylistId,
                    'snippet.resourceId.kind': 'youtube#video',
                    'snippet.resourceId.videoId': videoIds[i],
                }
            )
        );
    }

    let deleteRequests = [];
    for (let i = 0; i < videoItemIds.length; i++) {
        deleteRequests.push(
            buildApiRequest('DELETE', '/youtube/v3/playlistItems', {
                id: videoItemIds[i],
            })
        );
    }

    // Start off with a promise that always resolves
    let sequence = Promise.resolve();

    for (let i = 0; i < insertRequests.length; i++) {
        sequence = sequence
            .then(() => insertRequests[i])
            .then(t => {
                insertSuccessCallback({
                    data: t,
                    videoId: `${videoIds[i]}`,
                    videoItemId: `${videoItemIds[i]}`,
                });
            })
            .then(() => deleteRequests[i])
            .then(r => {
                deleteSuccessCallback({
                    data: r,
                    videoId: `${videoIds[i]}`,
                    videoItemId: `${videoItemIds[i]}`,
                });
            });
    }

}




export function removeMultipleFromPlaylist(
    videoItemIds,
    videoIds,
    playlistId,
    successCallback,
    failureCallback) {

    console.log('removeMultipleFromPlaylist', videoItemIds, videoIds, playlistId);

    if (!playlistId) return;

    let deleteRequests = [];
    for (let i = 0; i < videoItemIds.length; i++) {
        deleteRequests.push(
            buildApiRequest(
                'DELETE',
                '/youtube/v3/playlistItems',
                {
                    idx: videoItemIds[i],
                }
            )
        );
    }

    let sequence = Promise.resolve();
    for (let i = 0; i < deleteRequests.length; i++) {
        sequence = sequence
            .then(() => deleteRequests[i])
            .then(r => {
                successCallback({
                    data: r,
                    videoId: `${videoIds[i]}`,
                    videoItemId: `${videoItemIds[i]}`,
                });
            })
            .catch(function(reason) {
                console.log("remove failure", reason);
                if (failureCallback) {
                    failureCallback({
                        error: reason.result.error,
                        videoId: `${videoIds[i]}`,
                        videoItemId: `${videoItemIds[i]}`,
                    })
                }
            });
    }

}
