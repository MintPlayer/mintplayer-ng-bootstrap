import { PriorityQueueElement } from "./interfaces/priority-queue-element";
import { PriorityQueueOptions } from "./priority-queue-options";
import { Sorter } from "./types/sorter";

export class PriorityQueue {

	public static make(opts?: PriorityQueueOptions) {
		const T = PriorityQueue;
		const t = new PriorityQueue();
		opts = opts || { sorter: <Sorter | null>null };
		for (const key in T) {
			const prop = Object.getOwnPropertyDescriptor(T, key);
			const kv = Object.entries(T).find(([k, v]) => k === key);
			if (prop && kv) {
				Object.assign(t, { [key]: kv[1] });
			}
		}
		Object.assign(t, { sorter: opts.sorter || T.default_sorter });

		return t;
	}

	queue: PriorityQueueElement[] = [];
	sorter: Sorter | null = null;
	
	public static default_sorter: Sorter = (a: PriorityQueueElement, b: PriorityQueueElement) => {
		return a.cost - b.cost;
	};

	public push(value: string, cost: number) {
		const item = { value, cost };
		this.queue.push(item);
		this.queue.sort(this.sorter ?? undefined);
	}

	public pop() {
		return this.queue.shift();
	}

	public empty() {
		return this.queue.length === 0;
	}
}