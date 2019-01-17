
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
            if (params.hasOwnProperty(p) && (!params[p] || params[p] === 'undefined')) {
                delete params[p];
            }
        }
        return params;
    }

    export function executeRequest(request, callback, callbackError) {

        console.log("executeRequest begin");

        if (request === undefined || request === null) {
            console.log("executeRequest request is undefined or null");
            return;
        }

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

        console.log("executeRequest end");

    }


    /**
     *
     * @param requests array of requests
     */
    export function executeRequestsInBatch(requests, callback, callbackError) {

        console.log("executeRequestsInBatch", requests.length, callback, callbackError);

        let batch = window.gapi.client.newBatch();

        console.log("executeRequestsInBatch newBatch", batch);

        for (let i = 0; i < requests.length; i++) {
            console.log("executeRequestsInBatch, add req" + i);
            batch.add(requests[i]);
        }

        console.log("executeRequestsInBatch, will execute", batch);

        batch.execute(function(responseMap, rawBatchResponse, callback, callbackError) {
            console.log("batch.execute callback", responseMap, rawBatchResponse);
/*
            if (data) {
                if (data.error) {
                    console.warn(`batch.execute callback: ${data.error.code} ${data.error.message}`);
                    // if (callbackError) {
                    //     callbackError(data.error);
                    // }
                } else {
                    console.log('batch.execute callback: no error');
                    // if (callback) callback(data);
                    // if (data.nextPageToken) {
                    //     console.log('get next page', data.nextPageToken);
                    //     defineRequest(data.nextPageToken);
                    // }
                }
            } else {
                if (callback) callback();
            }
*/
        });

    }

    export function buildApiRequest(requestMethod, path, params, properties) {

        console.log("buildApiRequest", requestMethod, path, params, properties);

        if (window.gapi.client === undefined || window.gapi.client === null) {
            console.log("buildApiRequest window.gapi.client is undefined or null");
            return null;
        }

        params = removeEmptyParams(params);

        console.log("buildApiRequest params", params);

        let request;
        if (properties) {
            let resource = createResource(properties);

            console.log("buildApiRequest resource", resource);

            request = window.gapi.client.request({
                'body': resource,
                'method': requestMethod,
                'path': path,
                'params': params
            });
        } else {
            request = window.gapi.client.request({
                'method': requestMethod,
                'path': path,
                'params': params
            });
        }
        return request;
    }


    export function buildPlaylistsRequest(pageToken) {
        // console.log("buildPlaylistsRequests", pageToken);
        // console.log('GET /youtube/v3/playlists');
        return buildApiRequest(
            'GET',
            '/youtube/v3/playlists',
            {
                'mine': 'true',
                'maxResults': '50',
                'part': 'snippet,contentDetails',
                'onBehalfOfContentOwner': '',
                'onBehalfOfContentOwnerChannel': '',
                'pageToken': pageToken
            });
    }


    export function buildPlaylistItemsRequest(playlistId, pageToken) {
        // console.log('GET /youtube/v3/playlistItems');
        return buildApiRequest(
            'GET',
            '/youtube/v3/playlistItems',
            {
                'maxResults': '50',
                'part': 'snippet,contentDetails',
                'playlistId': playlistId,
                'pageToken': pageToken
            });
    }

    export function buildChannelsRequest() {
        // console.log("buildChannelsRequests", pageToken);
        return buildApiRequest(
            'GET',
            '/youtube/v3/channels',
            {
                'mine': 'true',
                'part': 'contentDetails'
            });
    }

