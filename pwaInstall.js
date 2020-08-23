let deferredInstallPrompt = null;
document.getElementById("pwaInstallPrompt").style.display = "none";

window.addEventListener("beforeinstallprompt", function (evt) {
	deferredInstallPrompt = evt;
});

function canInstall() {
	return deferredInstallPrompt && !window.matchMedia("(display-mode: standalone)").matches;
}

function showNativeInstallPrompt() {
	if (deferredInstallPrompt) {
		deferredInstallPrompt.prompt();
		deferredInstallPrompt = null;
	}
}

function promptInstall() {
	if (canInstall()) {
		const lastDenyTime = parseInt(localStorage.getItem("pwaInstallDenyTime - " + location.pathname) || "0", 10);
		if (Date.now() - lastDenyTime < 604800000) {
			return;
		}
		document.getElementById("pwaInstallPrompt").style.display = "";
		document.getElementById("pwaInstallPrompt").querySelector("button[name='accept']").addEventListener("click", function () {
			document.getElementById("pwaInstallPrompt").style.display = "none";
			showNativeInstallPrompt();
		});
		document.getElementById("pwaInstallPrompt").querySelector("button[name='deny']").addEventListener("click", function () {
			document.getElementById("pwaInstallPrompt").style.display = "none";
			localStorage.setItem("pwaInstallDenyTime - " + location.pathname, Date.now());
		});
	}
}