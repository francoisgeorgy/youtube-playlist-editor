
export function snippetTitleSort(a, b) {
    return a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase() ? 1 :
        b.snippet.title.toLowerCase() > a.snippet.title.toLowerCase() ? -1 :
            0;
}

export function snippetPublishedAtSort(a, b) {
    let d1 = Date.parse(a.snippet.publishedAt);
    let d2 = Date.parse(b.snippet.publishedAt);
    return d1 > d2 ? 1 :
        d2 > d1 ? -1 :
            0;
}

export function snippetPositionSort(a, b) {
    return a.snippet.position > b.snippet.position ? 1 :
        b.snippet.position > a.snippet.position ? -1 :
            0;
}

export function contentDetailsPublishedAtSort(a, b) {
    let d1 = Date.parse(a.contentDetails.publishedAt);
    let d2 = Date.parse(b.contentDetails.publishedAt);
    return d1 > d2 ? 1 :
        d2 > d1 ? -1 :
            0;
}

export function snippetTitleSortReverse(b, a) {
    return a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase() ? 1 :
        b.snippet.title.toLowerCase() > a.snippet.title.toLowerCase() ? -1 :
            0;
}

export function snippetPublishedAtSortReverse(b, a) {
    let d1 = Date.parse(a.snippet.publishedAt);
    let d2 = Date.parse(b.snippet.publishedAt);
    return d1 > d2 ? 1 :
        d2 > d1 ? -1 :
            0;
}

export function snippetPositionSortReverse(b, a) {
    return a.snippet.position > b.snippet.position ? 1 :
        b.snippet.position > a.snippet.position ? -1 :
            0;
}

export function contentDetailsPublishedAtSortReverse(b, a) {
    let d1 = Date.parse(a.contentDetails.publishedAt);
    let d2 = Date.parse(b.contentDetails.publishedAt);
    return d1 > d2 ? 1 :
        d2 > d1 ? -1 :
            0;
}
