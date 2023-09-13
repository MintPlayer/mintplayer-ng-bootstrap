import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { Tag } from './tag';

export interface TagCategory extends HasId<number> {
    id: number;
    color: string;
    description: string;
    tags: Tag[];
}