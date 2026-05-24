import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpFileManager,
  type NavigateEventDetail,
  type NodeOpenEventDetail,
  type SelectionChangeEventDetail,
  type UploadRequestEventDetail,
  type OperationEventDetail,
} from '@mintplayer/web-components/file-manager';

/**
 * React wrapper for `<mp-file-manager>`. Side-effect-registers the WC
 * via the import above. Surfaces the seven `mp-*` events the WC
 * dispatches with full detail typing.
 */
export const BsFileManager = createComponent({
  react: React,
  tagName: 'mp-file-manager',
  elementClass: MpFileManager,
  events: {
    onNavigate: 'mp-navigate' as EventName<CustomEvent<NavigateEventDetail>>,
    onNodeOpen: 'mp-node-open' as EventName<CustomEvent<NodeOpenEventDetail>>,
    onSelectionChange: 'mp-selection-change' as EventName<CustomEvent<SelectionChangeEventDetail>>,
    onUploadRequest: 'mp-upload-request' as EventName<CustomEvent<UploadRequestEventDetail>>,
    onOperation: 'mp-operation' as EventName<CustomEvent<OperationEventDetail>>,
    onChildrenLoaded: 'mp-children-loaded' as EventName<CustomEvent<{ folderId: string | null }>>,
    onError: 'mp-error' as EventName<CustomEvent<{ message: string }>>,
  },
});
