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
    return buildApiRequest('GET', '/youtube/v3/playlists', {
        id: id,
        part: 'snippet,contentDetails'
    });
}

export function buildPlaylistsRequest(pageToken) {
    return buildApiRequest('GET', '/youtube/v3/playlists', {
        mine: 'true',
        part: 'snippet,contentDetails',
        maxResults: '50',
        pageToken: pageToken
    });
}

export function buildChannelPlaylistsRequest(channelId, pageToken) {
    return buildApiRequest('GET', '/youtube/v3/playlists', {
        channelId: channelId,
        part: 'snippet,contentDetails',
        maxResults: '50',
        pageToken: pageToken
    });
}

export function buildPlaylistItemsRequest(playlistId, pageToken) {
    return buildApiRequest('GET', '/youtube/v3/playlistItems', {
        maxResults: '50',
        part: 'snippet,contentDetails',
        playlistId: playlistId,
        pageToken: pageToken
    });
}

export function buildChannelsRequest() {
    return buildApiRequest('GET', '/youtube/v3/channels', {
        mine: 'true',
        part: 'contentDetails'
    });
}



export function buildSubscriptionsRequest(pageToken) {
    return buildApiRequest('GET', '/youtube/v3/subscriptions', {
        mine: 'true',
        part: 'snippet,contentDetails',
        maxResults: 50,
        pageToken: pageToken
    });
}


/*
export function insertInPlaylist(videoId, moveToPlaylistId) {
    let insertRequest = buildApiRequest(
        'POST',
        '/youtube/v3/playlistItems',
        {
            part: 'snippet'
        },
        {
            'snippet.playlistId': moveToPlaylistId,
            'snippet.resourceId.kind': 'youtube#video',
            'snippet.resourceId.videoId': videoId
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
*/

export function executeRequest(request, callback, callbackError) {

    if (request === undefined || request === null) {
        console.log('executeRequest request is undefined or null');
        return;
    }

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
            if (callback) callback(response.result);
        }
    ).catch(
        (reason) => {
            if (callbackError) callbackError(reason);
        }
    );
}

export function copyMultipleIntoPlaylist(
    playlistItemIds,
    videoIds,
    moveToPlaylistId,
    progressCallback,
    successCallback,
    failureCallback) {

    console.log('copyMultipleIntoPlaylist', playlistItemIds, videoIds, moveToPlaylistId);

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
            .then(() => {
                if (progressCallback) {
                    progressCallback({videoId: `${videoIds[i]}`, playlistItemId: `${playlistItemIds[i]}`});
                }
            });
    }

    sequence
        .then(() => {
            console.log("copyMultipleIntoPlaylist: success");
            if (successCallback) {
                successCallback();
            }
        })
        .catch(function(reason) {
            console.log("copyMultipleIntoPlaylist: failure", reason);
            if (failureCallback) {
                failureCallback({
                    error: reason.result.error //,
                    // videoId: `${videoIds[i]}`,
                    // playlistItemId: `${playlistItemIds[i]}`,
                })
            }
        });

}

export function moveMultipleIntoPlaylist(
    playlistItemIds,
    videoIds,
    moveToPlaylistId,
    progressCallback,
    successCallback,
    failureCallback) {

    // console.log('moveMultipleIntoPlaylist', playlistItemIds, videoIds, moveToPlaylistId);

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
    for (let i = 0; i < playlistItemIds.length; i++) {
        deleteRequests.push(
            buildApiRequest('DELETE', '/youtube/v3/playlistItems', {
                id: playlistItemIds[i],
            })
        );
    }

    // Start off with a promise that always resolves
    let sequence = Promise.resolve();

    for (let i = 0; i < insertRequests.length; i++) {
        sequence = sequence
            .then(() => insertRequests[i])
            .then(() => deleteRequests[i])
            .then(() => {
                if (progressCallback) {
                    progressCallback({videoId: `${videoIds[i]}`, playlistItemId: `${playlistItemIds[i]}`});
                }
            });
    }

    sequence
        .then(t => {
            console.log("moveMultipleIntoPlaylist: call insertSuccessCallback");
            successCallback();
        })
        .catch(function(reason) {
            console.log("move failure", reason);
            if (failureCallback) {
                failureCallback({
                    error: reason.result.error //,
                    // videoId: `${videoIds[i]}`,
                    // playlistItemId: `${playlistItemIds[i]}`,
                })
            }
        });

}

export function removeMultipleFromPlaylist(
    playlistItemIds,
    videoIds,
    playlistId,
    progressCallback,
    successCallback,
    failureCallback) {

    console.log('removeMultipleFromPlaylist', playlistItemIds, videoIds, playlistId);

    if (!playlistId) return;

    let deleteRequests = [];
    for (let i = 0; i < playlistItemIds.length; i++) {
        deleteRequests.push(
            buildApiRequest(
                'DELETE',
                '/youtube/v3/playlistItems',
                {
                    id: playlistItemIds[i],
                }
            )
        );
    }

    let sequence = Promise.resolve();
    for (let i = 0; i < deleteRequests.length; i++) {
        sequence = sequence
            .then(() => deleteRequests[i])
            .then(() => {
                if (progressCallback) {
                    progressCallback({videoId: `${videoIds[i]}`, playlistItemId: `${playlistItemIds[i]}`});
                }
            });
    }

    sequence
        .then(r => {
            successCallback();
        })
        .catch(function(reason) {
            console.log("remove failure", reason);
            if (failureCallback) {
                failureCallback({
                    error: reason.result.error //,
                    // videoId: `${videoIds[i]}`,
                    // playlistItemId: `${playlistItemIds[i]}`,
                })
            }
        });

}
