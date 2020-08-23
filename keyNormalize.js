function keyNormalize(keyStr) {
	keyStr = keyStr.toLowerCase();
	if (keyStr === "spacebar") {
		return " ";
	} else if (keyStr === "left" || keyStr === "right" || keyStr === "up" || keyStr === "down") {
		return "arrow" + keyStr;
	} else if (keyStr === "esc") {
		return "escape";
	} else if (keyStr === "decimal") {
		return ".";
	} else if (keyStr === "multiply") {
		return "*";
	} else if (keyStr === "add") {
		return "+";
	} else if (keyStr === "divide") {
		return "/";
	} else if (keyStr === "subtract") {
		return "-";
	}
	return keyStr;
}