# Improvements to the navigation-lock feature
## Problem 1
### Description
At the moment the navigation-lock seems to malfunction.
Here's a simple scenario:
- Navigate to "Basic => Alert"
- Navigate to "Basic => Rating"
- Navigate to "Basic => Badge"
- Navigate to "Basic => Breadcrumb"
- Navigate to "Advanced => Navigation lock"
- Back => Click Cancel in the dialog
- Back => Click Cancel in the dialog
- Back => Click OK in the dialog

### Expected result
You should end up on "Basic => Breadcrumb"

### Current behavior
You end up on "Basic => Rating"

## Problem 2
### Description
To make the navigation-lock work, the developer has to add the `BsNavigationLockGuard` to each route's `CanDeactivate` property. This is inconvenient. A better solution should be found to hook into router events globally or react to history changes globally.

### Desired flow
1) Add some `provideNavigationLock()` to the global application-providers
2) Place the `bsNavigationLock` directive on any page that needs protection from leaving.