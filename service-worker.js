const VERSION_NUMBER = "1";

const FILES_TO_CACHE = [
	"Calculator/reset.css",
	"Calculator/highlight/monokai-sublime.css",
	"Calculator/main.css",
	"Calculator/highlight/highlight.min.js",
	"Calculator/Templates.js",
	"Calculator/keyNormalize.js",
	"Calculator/pwaInstall.js",
	"Calculator/script.js",
	"Calculator/esprima.min.js",
	"Calculator/manifest.json",
	"Calculator/icons/android-chrome-192x192.png",
	"Calculator/icons/android-chrome-512x512.png",
	"Calculator/icons/favicon.ico",
	"Calculator/icons/favicon-16x16.png",
	"Calculator/icons/favicon-32x32.png",
	"Calculator/icons/apple-touch-icon.png",
	"Calculator/icons/browserconfig.xml",
	"Calculator/icons/mstile-150x150.png",
	"Calculator/icons/site.webmanifest",
	"Calculator/icons/safari-pinned-tab.svg"
];

const CACHE_NAME = "offline-first-cache-" + hashArray(FILES_TO_CACHE.concat(VERSION_NUMBER));

self.addEventListener("install", (evt) => {
	evt.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			await Promise.all(FILES_TO_CACHE.map((url) => {
				return fetchNoCache(url).then((response) => {
					cache.put(url, response);
				});
			}));
		})
	);
	self.skipWaiting();
});

self.addEventListener("activate", (evt) => {
	evt.waitUntil(
		caches.keys().then((keyList) => {
			return Promise.all(keyList.map((key) => {
				if (key !== CACHE_NAME) {
					return caches.delete(key);
				}
				return null;
			}));
		})
	);
	self.clients.claim();
});

self.addEventListener("fetch", (evt) => {
	const url = evt.request.url.replace("https://creativetechguy.github.io", "").split("?")[0];
	if (!FILES_TO_CACHE.includes(url)) {
		return;
	}
	evt.respondWith(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.match(evt.request, { ignoreSearch: evt.request.url.includes("?v=") }).then((response) => {
				const fetchPromise = fetchNoCache(url).then((networkResponse) => {
					cache.put(url, networkResponse.clone());
					return networkResponse;
				});
				return response || fetchPromise;
			});
		})
	);
});

function fetchNoCache(url) {
	return fetch(`${url}?v=${Math.random()}`).then((response) => {
		if (!response.ok) {
			throw Error(response.statusText);
		}
		return response;
	});
}

function hashArray(arr) {
	let combinedHash = "";
	for (const item of arr) {
		combinedHash += hashCode(item).toString();
	}
	return hashCode(combinedHash);
}

function hashCode(str) {
	let hash = 0;
	if (str.length === 0) {
		return hash;
	}
	for (const char of str) {
		// eslint-disable-next-line no-bitwise
		hash = ((hash << 5) - hash) + char.charCodeAt(0);
		// eslint-disable-next-line no-bitwise
		hash = hash & hash;
	}
	return hash;
}