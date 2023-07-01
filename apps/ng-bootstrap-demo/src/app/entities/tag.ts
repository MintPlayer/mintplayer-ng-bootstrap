import { HasId } from '@mintplayer/ng-bootstrap/select2';
import { Subject } from './subject';
import { TagCategory } from './tag-category';

export interface Tag extends HasId {
    id: number;
    description: string;
    category: TagCategory;
    subjects: Subject[];

    parent: Tag;
    children: Tag[];
}