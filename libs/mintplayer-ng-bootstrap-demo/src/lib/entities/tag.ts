import { Subject } from './subject';
import { TagCategory } from './tag-category';

export interface Tag {
    id: number;
    description: string;
    category: TagCategory;
    subjects: Subject[];

    parent: Tag;
    children: Tag[];
}