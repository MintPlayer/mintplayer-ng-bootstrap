import { ConnectedPosition } from '@angular/cdk/overlay';
import { Position } from '@mintplayer/ng-bootstrap';

export function getConnectedPositions(position: Position): ConnectedPosition[] {
  switch (position) {
    case 'top':
      return [{
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom'
      }];
    case 'bottom':
      return [{
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top'
      }];
    case 'start':
      return [{
        originX: 'start',
        originY: 'center',
        overlayX: 'end',
        overlayY: 'center'
      }];
    case 'end':
      return [{
        originX: 'end',
        originY: 'center',
        overlayX: 'start',
        overlayY: 'center'
      }];
    default:
      return [{
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top'
      }];
  }
}

export function getContextMenuPositions(): ConnectedPosition[] {
  return [
    { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top' },
    { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom' },
    { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
    { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom' },
  ];
}
