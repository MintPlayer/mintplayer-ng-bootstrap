import { DateDayOfMonth } from "./date-day-of-month";

export interface Week {
    number: number;
    week: (DateDayOfMonth | null)[];
}