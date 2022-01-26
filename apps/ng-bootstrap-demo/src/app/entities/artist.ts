import { Subject } from './subject';

export interface Artist extends Subject {
    name: string;
    yearStarted: number;
    yearQuit: number;
}