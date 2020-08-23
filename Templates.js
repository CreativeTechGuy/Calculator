const Templates = {
	templates: {},
	init: function () {
		Array.prototype.slice.call(document.querySelectorAll("template")).forEach(function (template) {
			let templateRoot = null;
			if (template.content) {
				templateRoot = template.content.cloneNode(true);
			} else {
				templateRoot = template.cloneNode(true);
			}
			Templates.templates[template.getAttribute("data-template-name")] = {
				parent: template.parentElement,
				root: templateRoot
			};
			template.parentElement.removeChild(template);
		});
	},
	stamp: function (templateName, data) {
		const template = this.templates[templateName];
		const root = template.root.cloneNode(true);

		this.fillData(root, data);

		const newNode = root.children[0].cloneNode(true);
		template.parent.appendChild(newNode);

		return newNode;
	},
	fillData: function (root, data) {
		if (root.getAttribute && root.getAttribute("data-template-data")) {
			data = JSON.parse(root.getAttribute("data-template-data"));
			root.removeAttribute("data-template-data");
		}
		for (let childNodeIndex = 0; childNodeIndex < root.childNodes.length; childNodeIndex++) {
			const elem = root.childNodes[childNodeIndex];
			if (elem.nodeType === 3) {
				(elem.nodeValue.match(/{{(.*?)}}/g) || []).forEach(function (match) {
					const key = match.replace("{{", "").replace("}}", "");
					elem.nodeValue = elem.nodeValue.replace(new RegExp(Templates.regexEscape(match), "g"), data[key]);
				});
			} else {
				Array.prototype.slice.call(elem.attributes).forEach(function (attribute) {
					(attribute.value.match(/{{(.*?)}}/g) || []).forEach(function (match) {
						const key = match.replace("{{", "").replace("}}", "");
						if (attribute.name === "data-unsafe-inner-html") {
							elem.innerHTML = attribute.value.replace(new RegExp(Templates.regexEscape(match), "g"), data[key]);
						} else if (attribute.name === "data-for-each") {
							elem.removeAttribute("data-for-each");
							for (let i = data[key].length - 1; i >= 0; i--) {
								const newNode = elem.cloneNode(true);
								newNode.setAttribute("data-template-data", JSON.stringify(data[key][i]));
								elem.parentElement.insertBefore(newNode, elem.nextSibling);
							}
							elem.parentElement.removeChild(elem);
							childNodeIndex--;
						} else {
							elem.setAttribute(attribute.name, attribute.value.replace(new RegExp(Templates.regexEscape(match), "g"), data[key]));
						}
					});
				});
			}
			Templates.fillData(elem, data);
		}
	},
	eachElement: function (selector, callback) {
		Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(callback);
	},
	delete: function (selector) {
		this.eachElement(selector, function (element) {
			element.parentElement.removeChild(element);
		});
	},
	regexEscape: function (text) {
		// https://stackoverflow.com/a/9310752
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	}
};