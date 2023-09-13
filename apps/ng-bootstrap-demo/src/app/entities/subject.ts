import { HasId } from "@mintplayer/ng-bootstrap/has-id";
import { Medium } from "./medium";
import { Tag } from "./tag";

export interface Subject extends HasId<number> {
    id: number;
    text: string;
    media: Medium[];
    tags: Tag[];
}