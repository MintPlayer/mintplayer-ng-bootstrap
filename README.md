# @mintplayer/ng-bootstrap
## Installation

    npm i @mintplayer/ng-bootstrap

This should also install the peerDependencies in your project.

Now you should import the `bootstrap` stylesheet in the application. To do so, you have 2 options:

1) Update your `angular.json`:

    "styles": [
      "node_modules/@mintplayer/ng-bootstrap/_bootstrap.scss",
      "src/styles.scss"
    ],

2) Add the stylesheet in your `styles.scss`

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
