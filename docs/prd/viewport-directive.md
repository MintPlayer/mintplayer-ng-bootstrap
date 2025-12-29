# Add a viewport directive
## Goal
The goal is to add a new entrypoint with a new directive to the `@mintplayer/ng-bootstrap` library.
This `bsViewport` directive should look like this:
- enteredView: event
- leftView: event

## Implementation
The code can use the IntersectionObserver API, and should attach the IntersectionObserver to the host element.

## Important notes
Since we're using the IntersectionObserver API, we have to be careful.
Because this API is not available in NodeJS during server-side rendering.
A `!isPlatformServer(inject(PLATFORM_ID))` check will be required here.

## Linked issues
This feature should address the following issues completely:
- https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/130
- https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/166

Also analyze the comments on these issues, they may be important while implementing the solution.