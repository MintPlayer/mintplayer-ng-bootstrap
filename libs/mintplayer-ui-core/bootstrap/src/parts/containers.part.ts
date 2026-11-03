import { containersBootstrapPageStyles, containersBootstrapStyles } from '../../../styles/parts/containers.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapContainers: BootstrapPart = { key: 'bootstrap-containers', css: containersBootstrapStyles, page: false, order: 0 };
export const bootstrapContainersPage: BootstrapPart = { key: 'bootstrap-containers', css: containersBootstrapPageStyles, page: true, order: 0 };
