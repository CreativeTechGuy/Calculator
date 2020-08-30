const VERSION_NUMBER = "2";

const FILES_TO_CACHE = [
	"index.html",
	"reset.css",
	"highlight/monokai-sublime.css",
	"main.css",
	"highlight/highlight.min.js",
	"Templates.js",
	"keyNormalize.js",
	"pwaInstall.js",
	"script.js",
	"esprima.min.js",
	"manifest.json",
	"icons/android-chrome-192x192.png",
	"icons/android-chrome-512x512.png",
	"icons/favicon.ico",
	"icons/favicon-16x16.png",
	"icons/favicon-32x32.png",
	"icons/apple-touch-icon.png",
	"icons/browserconfig.xml",
	"icons/mstile-150x150.png",
	"icons/site.webmanifest",
	"icons/safari-pinned-tab.svg"
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
	let url = evt.request.url.split("?")[0];
	let path = url.replace("https://creativetechguy.github.io/Calculator/", "");
	if (path === "") {
		path = "index.html";
		url += "index.html";
	}
	if (!FILES_TO_CACHE.includes(path)) {
		return;
	}
	evt.respondWith(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.match(url).then((response) => {
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