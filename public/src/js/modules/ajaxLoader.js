/**
 * Ajax Loader Module
 * Intercepts fetch requests and manages loading state
 * On mobile, hides the bottom navigation during AJAX requests
 */

let activeRequests = 0;

export function initAjaxLoader() {
    // Override fetch to intercept all requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        startAjaxLoading();
        
        return originalFetch.apply(this, args)
            .then(response => {
                endAjaxLoading();
                return response;
            })
            .catch(error => {
                endAjaxLoading();
                throw error;
            });
    };
}

export function startAjaxLoading() {
    activeRequests++;
    if (activeRequests > 0) {
        document.body.classList.add('ajax-loading');
    }
}

export function endAjaxLoading() {
    activeRequests--;
    if (activeRequests <= 0) {
        activeRequests = 0;
        document.body.classList.remove('ajax-loading');
    }
}
