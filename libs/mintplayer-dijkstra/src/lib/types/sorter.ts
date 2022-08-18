import { PriorityQueueElement } from "../interfaces/priority-queue-element";

export type Sorter = (a: PriorityQueueElement, b: PriorityQueueElement) => number;