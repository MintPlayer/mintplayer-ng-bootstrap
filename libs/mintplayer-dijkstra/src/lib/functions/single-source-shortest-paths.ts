import { PriorityQueue } from "../priority-queue";

export function single_source_shortest_paths(graph: { [key: string]: any }, start: string, dest: string): any {
	// Predecessor map for each node that has been encountered.
	// node ID => predecessor node ID
	const predecessors = {};

	// Costs of shortest paths from s to all nodes encountered.
	// node ID => cost
	const costs: { [key: string]: any } = {};
	costs[start] = 0;

	// Costs of shortest paths from s to all nodes encountered; differs from
	// `costs` in that it provides easy access to the node that currently has
	// the known shortest path from s.
	// XXX: Do we actually need both `costs` and `open`?
	const open = PriorityQueue.make();
	open.push(start, 0);

	// var closest,
	// 		u, v,
	// 		cost_of_s_to_u,
	// 		adjacent_nodes,
	// 		cost_of_e,
	// 		cost_of_s_to_u_plus_cost_of_e,
	// 		cost_of_s_to_v,
	// 		first_visit;
	while (!open.empty()) {
		// In the nodes remaining in graph that have a known cost from s,
		// find the node, u, that currently has the shortest path from s.
		const closest = open.pop();
		if (closest) {
			const u = closest.value;
			const cost_of_s_to_u = closest.cost;

			// Get nodes adjacent to u...
			const adjacent_nodes = graph[u] || {};

			// ...and explore the edges that connect u to those nodes, updating
			// the cost of the shortest paths to any or all of those nodes as
			// necessary. v is the node across the current edge from u.
			for (const v in adjacent_nodes) {
				const prop = Object.getOwnPropertyDescriptor(adjacent_nodes, v);
				if (prop) {
					// Get the cost of the edge running from u to v.
					const cost_of_e = adjacent_nodes[v];

					// Cost of s to u plus the cost of u to v across e--this is *a*
					// cost from s to v that may or may not be less than the current
					// known cost to v.
					const cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;

					// If we haven't visited v yet OR if the current known cost from s to
					// v is greater than the new cost we just found (cost of s to u plus
					// cost of u to v across e), update v's cost in the cost list and
					// update v's predecessor in the predecessor list (it's now u).
					const cost_of_s_to_v = costs[v];
					const first_visit = (typeof costs[v] === 'undefined');
					if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
						costs[v] = cost_of_s_to_u_plus_cost_of_e;
						open.push(v, cost_of_s_to_u_plus_cost_of_e);
						Object.assign(predecessors, { [v]: u });
					}
				}
			}
		}
	}

	if (typeof dest !== 'undefined' && typeof costs[dest] === 'undefined') {
		throw new Error(`Could not find a path from ${start} to ${dest}.`);
	}

	return predecessors;
}