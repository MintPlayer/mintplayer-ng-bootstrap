import { Resource } from "./resource";

export interface ResourceGroup {
    description: string;
    children: (ResourceGroup | Resource)[];
}