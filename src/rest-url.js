/** Join a WordPress REST root and route with either plain or pretty permalinks. */
export const buildRestUrl = (path, root) => {
    const base = root || window.AceMediaGlossaryAdmin?.restRoot || window.wpApiSettings?.root || '/wp-json/';
    const url = new URL(base, window.location.href);
    const [route, ...queryParts] = String(path).replace(/^\/+/, '').split('?');
    if (url.searchParams.has('rest_route')) {
        const prefix = url.searchParams.get('rest_route').replace(/\/+$/, '');
        url.searchParams.set('rest_route', `${prefix}/${route}`);
    } else {
        url.pathname = `${url.pathname.replace(/\/+$/, '')}/${route}`;
    }
    new URLSearchParams(queryParts.join('?')).forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
};
