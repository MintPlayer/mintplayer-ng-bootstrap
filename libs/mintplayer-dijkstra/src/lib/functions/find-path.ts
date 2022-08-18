import { extract_shortest_path_from_predecessor_list } from "./extract-shortest-path-from-predecessor-list";
import { single_source_shortest_paths } from "./single-source-shortest-paths";

export function find_path(graph: { [key: string]: any }, start: string, dest: string) {
	const predecessors = single_source_shortest_paths(graph, start, dest);
	return extract_shortest_path_from_predecessor_list(predecessors, dest);
}