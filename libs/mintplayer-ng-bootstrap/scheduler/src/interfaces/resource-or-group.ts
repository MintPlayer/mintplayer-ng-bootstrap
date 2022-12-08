import { Resource } from "./resource";
import { ResourceGroup } from "./resource-group";

export interface ResourceOrGroup {
    resource: Resource | null;
    resourceGroup: ResourceGroup | null;
}