import * as Utils from "../utils";

const FINDER_PATTERN_SIZE = 7;

export function getPositions (version: number) {
	const size = Utils.getSymbolSize(version)
  
	return [
		// top-left
		[0, 0],
		// top-right
		[size - FINDER_PATTERN_SIZE, 0],
		// bottom-left
		[0, size - FINDER_PATTERN_SIZE]
	];
}
  