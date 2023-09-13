import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { Subject } from './subject';
import { TagCategory } from './tag-category';

export interface Tag extends HasId<number> {
    id: number;
    description: string;
    category: TagCategory;
    subjects: Subject[];

    parent: Tag;
    children: Tag[];
}