import { find_path } from "@mintplayer/dijkstra";
import { AlphanumericData } from "./data-types/alphanumeric-data";
import { ByteData } from "./data-types/byte-data";
import { KanjiData } from "./data-types/kanji-data";
import { NumericData } from "./data-types/numeric-data";
import * as Mode from "./mode";
import * as Utils from "./utils";
import { ALPHANUMERIC, BYTE, BYTE_KANJI, KANJI, NUMERIC } from "./regex";
import { Segment } from "./segment";

function getStringByteLength(str: string) {
	return unescape(encodeURIComponent(str)).length;
}

function getSegments(regex: RegExp, mode: Mode.Mode, str: string) {
	const segments: Segment[] = [];
	let result: RegExpExecArray | null;

	while ((result = regex.exec(str)) !== null) {
		segments.push({
			data: result[0],
			index: result.index,
			mode: mode,
			length: result[0].length,
		});
	}

	return segments;
}

function getSegmentsFromString(str: string) {
	const numSegs = getSegments(NUMERIC, Mode.NUMERIC, str);
	const alphaNumSegs = getSegments(ALPHANUMERIC, Mode.ALPHANUMERIC, str);
	const kanjiEnabled = Utils.isKanjiModeEnabled();
	const byteSegs = kanjiEnabled
		? getSegments(BYTE, Mode.BYTE, str)
		: getSegments(BYTE_KANJI, Mode.BYTE, str);
	const kanjiSegs = kanjiEnabled
		? getSegments(KANJI, Mode.KANJI, str)
		: [];

	const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
	return segs
		.sort((s1, s2) => (s1.index ?? 0) - (s2.index ?? 0))
		.map((seg) => (<Segment>{
			data: seg.data,
			mode: seg.mode,
			length: seg.length,
			index: seg.index,
		}));
}

function getSegmentBitsLength(length: number, mode: Mode.Mode) {
	switch (mode) {
		case Mode.NUMERIC:
			return NumericData.getBitsLength(length);
		case Mode.ALPHANUMERIC:
			return AlphanumericData.getBitsLength(length);
		case Mode.KANJI:
			return KanjiData.getBitsLength(length);
		case Mode.BYTE:
			return ByteData.getBitsLength(length);
		default:
			throw new Error(`Unknown mode: ${mode}`);
	}
}

function mergeSegments(segs: Segment[]) {
	return segs.reduce((acc: Segment[], curr: Segment) => {
		const prevSeg = (acc.length >= 1)
			? acc[acc.length - 1]
			: null;
		
		if (prevSeg && (prevSeg.mode === curr.mode)) {
			acc[acc.length - 1].data += curr.data;
			return acc;
		}

		acc.push(curr);
		return acc;
	}, []);
}

function buildNodes(segs: Segment[]) {
	return segs.map(seg => {
		switch (seg.mode) {
			case Mode.NUMERIC:
				return [
					seg,
					{ data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
					{ data: seg.data, mode: Mode.BYTE, length: seg.length },
				];
			case Mode.ALPHANUMERIC:
				return [
					seg,
					{ data: seg.data, mode: Mode.BYTE, length: seg.length },
				];
			case Mode.KANJI:
				return [
					seg,
					{ data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) },
				];
			case Mode.BYTE:
				return [
					{ data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) },
				];
			default:
				throw new Error(`Unknown segment mode: ${seg.mode}`);
		}
	});
}

function buildGraph(nodes: Segment[][], version: number) {
	const table: { [key: string]: {node: Segment, lastCount: number}} = {};
	const graph: { [key: string]: any } = {
		start: {},
	};
	let prevNodeIds = ['start'];

	for (let i = 0; i < nodes.length; i++) {
		const nodeGroup = nodes[i];
		const currentNodeIds = [];
		for (let j = 0; j < nodeGroup.length; j++) {
			const node = nodeGroup[j];
			const key = `${i}${j}`;
			currentNodeIds.push(key);
			table[key] = { node, lastCount: 0 };
			graph[key] = {};

			for (let n = 0; n < prevNodeIds.length; n++) {
				const prevNodeId = prevNodeIds[n];

				if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
					graph[prevNodeId][key] =
						getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) -
						getSegmentBitsLength(table[prevNodeId].lastCount, node.mode)

					table[prevNodeId].lastCount += node.length
				} else {
					if (table[prevNodeId]) {
						table[prevNodeId].lastCount = node.length;
					}

					graph[prevNodeId][key] =
						getSegmentBitsLength(node.length, node.mode) +
						4 +
						Mode.getCharCountIndicator(node.mode, version) // switch cost
				}
			}
		}

		prevNodeIds = currentNodeIds;
	}

	for (let n = 0; n < prevNodeIds.length; n++) {
		graph[prevNodeIds[n]].end = 0;
	}

	return {
		map: graph,
		table: table,
	};
}

export function buildSingleSegment(data: string, modesHint: Mode.Mode | null) {
	const bMode = Mode.getBestModeForData(data);
	const bestMode = bMode;
	let mode = modesHint
		? Mode.from(modesHint, bMode)
		: bestMode;

	// Make sure data can be encoded
	if ((mode !== Mode.BYTE) && (mode.bit < bestMode.bit)) {
		throw new Error(`"${data}" cannot be encoded with mode ${Mode.toString(mode)}`)
	}

	// Use Mode.BYTE if kanjii support is disabled
	if ((mode === Mode.KANJI) && !Utils.isKanjiModeEnabled()) {
		mode = Mode.BYTE;
	}

	switch (mode) {
		case Mode.NUMERIC:
			return new NumericData(data);
		case Mode.ALPHANUMERIC:
			return new AlphanumericData(data);
		case Mode.KANJI:
			return new KanjiData(data);
		case Mode.BYTE:
			return new ByteData(data);
		default:
			throw new Error(`Invalid value ${mode} for mode`);
	}
}

export function fromArray(array: Segment[]) {
	return array.reduce((acc: (NumericData | ByteData | AlphanumericData | KanjiData)[], seg: Segment) => {
		if (typeof seg === 'string') {
			const t = buildSingleSegment(seg, null);
			acc.push(t);
		} else if (seg.data) {
		// if (seg.data) {
			const t = buildSingleSegment(seg.data, seg.mode);
			acc.push(t);
		}

		return acc;
	}, []);
}

export function fromString(data: string, version: number) {
	const segs = getSegmentsFromString(data);
	const nodes = buildNodes(segs);
	const graph = buildGraph(nodes, version);
	const path = find_path(graph.map, 'start', 'end');

	const optimizedSegs: Segment[] = [];
	for (let i = 1; i < path.length - 1; i++) {
		optimizedSegs.push(graph.table[path[i]].node);
	}

	return fromArray(mergeSegments(optimizedSegs));
}

export function rawSplit(data: string) {
	return fromArray(getSegmentsFromString(data));
}