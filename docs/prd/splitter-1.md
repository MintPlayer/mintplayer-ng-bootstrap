# PRD: Refactor the splitter component
## Current code
At the moment the @mintplayer/ng-bootstrap library contains a splitter component.
The code is located here: libs\mintplayer-ng-bootstrap\splitter
However the current code is sub-optimal. It uses the @angular/cdk domportal. But in the current state of the code, these dom-portals fail to attach to the proper location, and the splitter component is mis-rendered.

Reference: libs\mintplayer-ng-bootstrap\splitter\src\splitter\splitter.component.html

## Proposed solution
Turn the Splitter component into a webcomponent. By using content-projection through the shadow-dom we can flawlessly render the panels at the correct location.

## Requirements
I prefer to see the webcomponents in a new typescript library (`@mintplayer/splitter`). The same already happened for the scheduler component too.