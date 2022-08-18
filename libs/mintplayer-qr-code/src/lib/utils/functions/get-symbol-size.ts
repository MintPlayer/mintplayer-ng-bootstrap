export function getSymbolSize(version: number) {
	if (!version) {
		throw new Error('"version" cannot be null or undefined');
	} else if (version < 1 || version > 40) {
		throw new Error('"version" should be in range from 1 to 40');
	} else {
		return version * 4 + 17;
	}
}