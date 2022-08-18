import * as Utils from '../utils';

export function getRowColCoords(version: number) {
	if (version === 1) {
		return [];
	}
	
	const posCount = Math.floor(version / 7) + 2;
	const size = Utils.getSymbolSize(version);
	const intervals = (size === 145)
		? 26
		: Math.ceil((size - 13) / (2 * posCount - 2)) * 2
	const positions = [size - 7]; // Last coord is always (size - 7)
	
	for (let i = 1; i < posCount - 1; i++) {
		positions[i] = positions[i - 1] - intervals;
	}
	
	positions.push(6); // First coord is always 6
	
	return positions.reverse();
}

export function getPositions(version: number) {
	const coords = [];
	const pos = getRowColCoords(version);
	const posLength = pos.length;
	
	for (let i = 0; i < posLength; i++) {
		for (let j = 0; j < posLength; j++) {
			// Skip if position is occupied by finder patterns
			if ((i === 0 && j === 0) || // top-left
				(i === 0 && j === posLength - 1) || // bottom-left
				(i === posLength - 1 && j === 0)) { // top-right
				continue;
			}
		
			coords.push([pos[i], pos[j]]);
		}
	}
	
	return coords;
}