import { SortDirection } from "../types/sort-direction";

export interface SortColumn {
    property: string;
    direction: SortDirection;
}
