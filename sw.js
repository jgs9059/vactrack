const VERSION = "v2";

//offline resource list. things we want access to offline (gets cached)
const APP_STATIC_RESOURCES = [
    "index.html",
    "style.css",
    "app.js",
    "vacationtracker.json",
    "assets/icons/icon-512x512.png",
];

const CACHE_NAME = `vacation-tracker-${VERSION}`;

/* handle the install event and retrieve and store the files listed for the cache.*/

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache =await caches.open(CACHE_NAME);
            cache.addAll(APP_STATIC_RESOURCES);
        })()
    );
});

/* use the activate event to delete any old caches so we dont run out of space. We're going to delete all but the current one then
we are going to set the service worker as the controller for our app (PWA)*/

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            //get the names of the existing caches 
            const names = await caches.keys();

            //iterate through the list and check each one to see if it is current cache and delete if is not
            await Promise.all(
                names.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            )//promise all

            //use claim() method of clinets interface to
            //enable our service worker as the controller
            await clinets.claim();
        })()
    ); //waitUntil 
});

/* use the fetch event to intercept requests to the server so we can
serve up our cached pages or respond with an error or 404 */

self.addEventListener("fetch", (event) => {
    event.respondWith(
        (async () => {

        //try to get the resource from the cache
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }

        //if not in the cache try to fetch from the network
        try {
            const networkResponse = await fetch(event.request);

            //cache the new response for future use
            cache.put(event.request, networkResponse.clone());

            return networkResponse;

        } catch(error) {
            console.error("Fetch failed; returning offline page instead", error);

            //if the request is for a page, return index.html as a fallback
            if (event.request.mode === "navigate") {
                return cache.match("/index.html");
            } 
            //for everything else, just throw and error
            //you mihgt want to return a default offline asset instead

            throw error;
        }
        })()
    );//respondWith
}); //fetch

//send a message to the client - we will use to update data later
function sendMessageToPWA(message) {
    self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
            client.postMessage(message);
        });
    });
}

//send a message every 10 seconds
setInterval(() => {
    sendMessageToPWA({type: "update", data: "new data available"});
}, 1000);

//listen for messagess from the app
self.addEventListener("message", (event)=>{
    console.log("Service worker recieved a message", event.data);

    //you can respond back if needed

    event.source.postMessage({
        type: "response",
        data: "Message received by service worker",
    });
});

