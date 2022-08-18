import { Mode } from "./mode";

export interface Segment {
	data: string;
	index?: number;
	mode: Mode;
	length: number;
}