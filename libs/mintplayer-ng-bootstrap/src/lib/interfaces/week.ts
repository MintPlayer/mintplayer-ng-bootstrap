import { DateDayOfMonth } from "./date-day-of-month";

export interface Week {
    number: number;
    days: (DateDayOfMonth | null)[];
}