# PRD: Decrease bundle size
## Goals
In order to minimize the bundle size we can do several things
- Remove rxjs from the output bundle (main.js)
- Remove zone.js from the output bundle

Since zone.js will no longer be available, we need to:
- Use angular signals in our commponents
- Use OnPush change detection

## Relevant files
- package.json
- typescript files from angular libraries

## Confirmation of goals
We should be able to see the bundle size before and after implementing the changes.
Installing the source-map-explorer, and adding a script to the package.json file can help us with this.
If this script already exists, it should just be updated (analyze).

We won't be using the webpack-bundle-analyzer anymore.
Only the source-map-explorer will be configured to analyze the bundle.
Make the script names as short as possible.