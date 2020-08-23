/* eslint-disable no-eval */
/* globals hljs, esprima, keyNormalize, Templates, promptInstall, canInstall, showNativeInstallPrompt */

if ("serviceWorker" in navigator) {
	window.addEventListener("load", function () {
		navigator.serviceWorker.register("/Calculator/service-worker.js").then(function (registration) {
			registration.update();
		});
	});
}

hljs.configure({
	tabReplace: "    "
});
Templates.init();

let _ans = null;

(function () {
	const MAX_HISTORY = 1000;
	let history = JSON.parse(localStorage.getItem("Calculator-history") || '["help"]');
	const inputElem = document.getElementById("input");

	let arrowIndex = null;

	let evaluationsThisSession = 0;
	let lastActiveTime = Date.now();
	let wasIdle = true;

	for (const itemKey in history) {
		if (!runCommand(history[itemKey])) {
			addHistoryRow(history[itemKey]);
		}
	}
	scrollToBottom();

	window.addEventListener("keydown", function (evt) {
		if (Date.now() - lastActiveTime > 10000 && inputElem.value.length === 0) {
			wasIdle = true;
		}
		lastActiveTime = Date.now();
		const key = keyNormalize(evt.key);
		if (key === "enter" && arrowIndex !== null) {
			document.querySelectorAll(".history-row:not(.no-highlight)")[arrowIndex].click();
		}
		if (key === "arrowup" || key === "arrowdown") {
			inputElem.blur();
			const rows = document.querySelectorAll(".history-row:not(.no-highlight)");
			if (arrowIndex === null) {
				arrowIndex = rows.length - 1;
			} else if (key === "arrowup" && arrowIndex > 0) {
				arrowIndex--;
			} else if (key === "arrowdown" && arrowIndex < rows.length - 1) {
				arrowIndex++;
			}
			resetArrowHighlight();
			rows[arrowIndex].className += " highlighted";
			scrollTo(rows[arrowIndex].offsetTop - rows[arrowIndex].offsetHeight * 3);
		}
	});

	inputElem.addEventListener("keydown", function (evt) {
		const key = keyNormalize(evt.key);
		if (key === "enter" && this.value.trim().length > 0) {
			if (++evaluationsThisSession >= 3) {
				promptInstall();
			}
			history.push(this.value);
			if (history.length > MAX_HISTORY) {
				history.shift();
			}
			localStorage.setItem("Calculator-history", JSON.stringify(history));
			if (!runCommand(this.value)) {
				addHistoryRow(this.value);
			}
			this.value = "";
			scrollToBottom();
			wasIdle = false;
		}
	});

	inputElem.addEventListener("keyup", function (evt) {
		const key = keyNormalize(evt.key);
		if (!wasIdle && this.value.trim().length === 1 && ["+", "-", "/", "*", "%"].indexOf(this.value.trim()[0]) !== -1 && _ans !== null) {
			this.value = "ans" + this.value;
		}
	});

	function addHistoryRow(value) {
		arrowIndex = null;
		let result = null;
		let isError = false;
		let parsedScript;
		let isAssignment = false;
		let overwritesWindow = false;
		let escapedScript = value;
		try {
			parsedScript = esprima.parseScript(value, { tokens: true, range: true });
			isAssignment = JSON.stringify(parsedScript).indexOf('"type":"AssignmentExpression"') !== -1;
			for (let i = parsedScript.tokens.length - 1; i >= 0; i--) {
				if (parsedScript.tokens[i].type === "Identifier") {
					let addition = "_";
					if (typeof Math[parsedScript.tokens[i].value] !== "undefined") {
						addition = "Math.";
						overwritesWindow = true;
					}
					if (typeof window[parsedScript.tokens[i].value] !== "undefined") {
						overwritesWindow = true;
					}
					escapedScript = escapedScript.slice(0, parsedScript.tokens[i].range[0]) + addition + parsedScript.tokens[i].value + escapedScript.slice(parsedScript.tokens[i].range[1]);
				}
			}
		} catch (e) {
			console.log("Parsing failed", e);
		}
		try {
			if (isAssignment && overwritesWindow) {
				throw new Error("Assignment to a constant variable");
			}
			result = eval(escapedScript || value);
		} catch (e) {
			isError = true;
			result = "Error: " + e.message.replace("_", "");
		}
		if (typeof result === "function" || typeof result === "undefined") {
			result = null;
		} else if (!isError && typeof result === "number" && !isAssignment) {
			_ans = result;
		}
		if (typeof result === "number") {
			result = nwc(result);
		}
		const row = Templates.stamp("historyRow", {
			input: hljs.highlight("javascript", value, true).value,
			output: "-> " + result,
			outputClass: isError ? "output-error no-highlight" : ""
		});
		Array.prototype.slice.call(row.querySelectorAll(".history-row:not(.no-highlight)")).forEach(function (elem) {
			elem.addEventListener("click", function () {
				const parsedResult = this.innerText.replace("-> ", "").replace(/([0-9]),([0-9])/g, "$1$2");
				inputElem.value += parsedResult;
				inputElem.focus();
				arrowIndex = null;
				resetArrowHighlight();
			});
		});
	}

	function runCommand(input) {
		input = input.toLowerCase();
		if (input === "cls" || input === "clear") {
			Templates.delete(".history-item");
			history = [];
			localStorage.setItem("Calculator-history", JSON.stringify(history));
			_ans = null;
			const customVariables = getCustomVariables();
			for (let i = 0; i < customVariables.length; i++) {
				delete window[customVariables[i]];
			}
			return true;
		}
		if (input === "vars" || input === "ls" || input === "list") {
			const list = [];
			const customVariables = getCustomVariables();
			for (let i = 0; i < customVariables.length; i++) {
				if (typeof window[customVariables[i]] === "number") {
					list.push({
						item: "-> " + customVariables[i].slice(1) + " = " + nwc(window[customVariables[i]])
					});
				}
			}
			Templates.stamp("historyRowList", {
				input: input,
				list: list
			});
			return true;
		}
		if (input === "help" || input === "?" || input === "man" || input === "instruction" || input === "instructions" || input === "menu") {
			const items = [
				{ item: "• Type an expression in the box below and press enter to evaluate" },
				{ item: "• You can define variables and reference them later (ex: \"amount = 1423\")" },
				{ item: "• \"ans\" is a magic variable which always holds the result of the last successful evaluation" },
				{ item: "• You can use any function/constant which is part of <a href=\"https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math\" target=\"_blank\" rel=\"noopener noreferrer\">JavaScript's Math Object</a> (ex: \"round(pow(PI, 3))\")" },
				{ item: "• You can click on a previous result to copy it to the input box. Alternatively use up/down and enter." },
				{ item: "----------" },
				{ item: "The following commands are available:" },
				{ item: "• clear   - erases all history and saved variables" },
				{ item: "• vars    - lists all defined variables and their values" },
				{ item: "• help    - view this help information" }
			];
			if (canInstall()) {
				items.push({ item: "• install - triggers install prompt" });
			}
			items.push({ item: "" });
			Templates.stamp("historyRowListInnerHTML", {
				input: "Calculator Help",
				list: items
			});
			return true;
		}
		if (input === "install") {
			showNativeInstallPrompt();
			return true;
		}
		return false;
	}

	function resetArrowHighlight() {
		if (document.querySelector(".history-row.highlighted") !== null) {
			document.querySelector(".history-row.highlighted").className = document.querySelector(".history-row.highlighted").className.replace("highlighted", "").trim();
		}
	}

	function scrollToBottom() {
		scrollTo(document.getElementById("history").scrollHeight - document.getElementById("history").offsetHeight);
	}

	function scrollTo(y) {
		document.getElementById("history").scrollTop = y;
	}

	function getCustomVariables() {
		const list = [];
		Object.getOwnPropertyNames(window).forEach(function (item) {
			if (item.indexOf("_") === 0) {
				list.push(item);
			}
		});
		return list;
	}

	function nwc(x) {
		const parts = x.toString().split(".");
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return parts.join(".");
	}
})();