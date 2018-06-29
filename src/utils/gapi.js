
    export function createResource(properties) {
        console.log("createResource");
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
            ;
        }
        return resource;
    }

    export function removeEmptyParams(params) {
        console.log("removeEmptyParams");
        for (let p in params) {
            if (params.hasOwnProperty(p) && (!params[p] || params[p] === 'undefined')) {
                delete params[p];
            }
        }
        return params;
    }

    export function executeRequest(request, callback, callbackError) {
        console.log("executeRequest");
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
    }

    export function buildApiRequest(api, requestMethod, path, params, properties) {
        console.log("buildApiRequest");
        params = removeEmptyParams(params);
        let request;
        if (properties) {
            let resource = createResource(properties);
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
