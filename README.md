# @mintplayer/ng-bootstrap
## Version info

| License      | Build status | Code coverage |
|--------------|--------------|---------------|
| [![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](https://opensource.org/licenses/Apache-2.0) | [![master](https://github.com/MintPlayer/mintplayer-ng-bootstrap/actions/workflows/publish-master.yml/badge.svg)](https://github.com/MintPlayer/mintplayer-ng-bootstrap/actions/workflows/publish-master.yml) | [![codecov](https://codecov.io/gh/MintPlayer/mintplayer-ng-bootstrap/branch/master/graph/badge.svg?token=X0G8OV053U)](https://codecov.io/gh/MintPlayer/mintplayer-ng-bootstrap) |



| Package                      | Version |
|------------------------------|---------|
| @mintplayer/ng-animations    | [![npm version](https://badge.fury.io/js/%40mintplayer%2Fng-animations.svg)](https://badge.fury.io/js/%40mintplayer%2Fng-animations) |
| @mintplayer/ng-click-outside | [![npm version](https://badge.fury.io/js/%40mintplayer%2Fng-click-outside.svg)](https://badge.fury.io/js/%40mintplayer%2Fng-click-outside) |
| @mintplayer/ng-focus-on-load | [![npm version](https://badge.fury.io/js/%40mintplayer%2Fng-focus-on-load.svg)](https://badge.fury.io/js/%40mintplayer%2Fng-focus-on-load) |
| @mintplayer/ng-bootstrap     | [![npm version](https://badge.fury.io/js/%40mintplayer%2Fng-bootstrap.svg)](https://badge.fury.io/js/%40mintplayer%2Fng-bootstrap) |

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
