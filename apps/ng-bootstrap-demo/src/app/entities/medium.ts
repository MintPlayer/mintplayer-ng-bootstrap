import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { MediumType } from './medium-type';

export interface Medium extends HasId<number> {
    id: number;
    value: string;
    type: MediumType;
}