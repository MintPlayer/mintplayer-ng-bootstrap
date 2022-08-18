export function extract_shortest_path_from_predecessor_list(predecessors: any, dest: string) {
    const nodes = [];
    let u = dest;
    let predecessor: any;
    while (u) {
      nodes.push(u);
      predecessor = predecessors[u];
      u = predecessors[u];
    }
    nodes.reverse();
    return nodes;
  }