import { PageNumberType } from "../types/page-number.type";

export interface PageWithSelection {
    page: PageNumberType;
    selected: boolean;
}