import { HasId } from "@mintplayer/ng-bootstrap/has-id";

export interface MediumType extends HasId<number> {
    id: number;
    description: string;
    visible: boolean;
}