import { BsNavigationLockDirective } from "../directive/navigation-lock.directive";

/**
 * Implement this interface on pages that use the `<... bsNavigationLock>` directive:
 * 
 * @example
 * 
 * ```ts
 * ViewChild('navigationLock') navigationLock!: BsNavigationLockDirective;
 * ```
 * 
 * Don't forget to add the `canDeactivate: [BsNavigationLockGuard]` guard to your page route.
 */
export interface BsHasNavigationLock {
    navigationLock: BsNavigationLockDirective;
}
