# @mintplayer/ng-bootstrap
## Version info

| License      | Build status |
|--------------|--------------|
| [![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](https://opensource.org/licenses/Apache-2.0) | [![master](https://github.com/MintPlayer/mintplayer-ng-bootstrap/actions/workflows/publish-master.yml/badge.svg)](https://github.com/MintPlayer/mintplayer-ng-bootstrap/actions/workflows/publish-master.yml) |



| Package                      | Version | Code coverage |
|------------------------------|---------|---------------|
| @mintplayer/ng-animations    | [![npm version](https://badge.fury.io/js/%40mintplayer%2Fng-animations.svg)](https://badge.fury.io/js/%40mintplayer%2Fng-animations) | [![codecov](https://codecov.io/gh/MintPlayer/mintplayer-ng-animations/branch/master/graph/badge.svg?token=X0G8OV053U)](https://codecov.io/gh/MintPlayer/mintplayer-ng-animations) |
| @mintplayer/ng-click-outside | [![npm version](https://badge.fury.io/js/%40mintplayer%2Fng-click-outside.svg)](https://badge.fury.io/js/%40mintplayer%2Fng-click-outside) | [![codecov](https://codecov.io/gh/MintPlayer/mintplayer-ng-click-outside/branch/master/graph/badge.svg?token=X0G8OV053U)](https://codecov.io/gh/MintPlayer/mintplayer-ng-click-outside) |
| @mintplayer/ng-focus-on-load | [![npm version](https://badge.fury.io/js/%40mintplayer%2Fng-focus-on-load.svg)](https://badge.fury.io/js/%40mintplayer%2Fng-focus-on-load) | [![codecov](https://codecov.io/gh/MintPlayer/mintplayer-ng-focus-on-load/branch/master/graph/badge.svg?token=X0G8OV053U)](https://codecov.io/gh/MintPlayer/mintplayer-ng-focus-on-load) |
| @mintplayer/ng-bootstrap     | [![npm version](https://badge.fury.io/js/%40mintplayer%2Fng-bootstrap.svg)](https://badge.fury.io/js/%40mintplayer%2Fng-bootstrap) | [![codecov](https://codecov.io/gh/MintPlayer/mintplayer-ng-bootstrap/branch/master/graph/badge.svg?token=X0G8OV053U)](https://codecov.io/gh/MintPlayer/mintplayer-ng-bootstrap) |

## Installation

    npm i @mintplayer/ng-bootstrap

This should also install the peerDependencies in your project.

Now you should import the `bootstrap` stylesheet in the application. To do so, you have 2 options:

Update your `angular.json`:

    "styles": [
      "node_modules/@mintplayer/ng-bootstrap/_bootstrap.scss",
      "src/styles.scss"
    ],

Or add the stylesheet in your `styles.scss`

    @import 'node_modules/@mintplayer/ng-bootstrap/_bootstrap.scss';

## Components
All components are showcased in the angular app included in the project. You can simply run

    npm start -- --open

to discover them.

## Discover yourself
Make sure you have [NodeJS](https://nodejs.org/en/download/) installed.
Then run following commands

    git clone https://github.com/MintPlayer/mintplayer-ng-bootstrap
    npm i
    npm start -- --open
