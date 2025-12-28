# Navbar and RouterModule anchorscrolling

## Problem statement
This is a description of the [following issue](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/165).

- When using the RouterModule with anchorScrolling
- When the navbar is in small mode

and the user clicks a link pointing to an anchor/fragment #, the navbar collapses. This happens at the same time the angular RouterModule scrolls to the specified anchor.

The angular RouterModule uses the [`scrollIntoView`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) method, which doesn't allow passing in a delay, or a duration.
This means we cannot know when the anchorScrolling has completed, before we collapse the navbar. Unless we can detect when the scroll-offset no longer changes.

Another option would be to wait until the navbar collapsed, before we navigate/scroll to the selected anchor.