export interface RemoveFromPaneResult {
    /** Indicates if the BsDockPane was removed from the host. */
    paneRemoved: boolean;

    /** Indicates if the host is empty now, and should also be removed. */
    hostIsEmpty: boolean;
}