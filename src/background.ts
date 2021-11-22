/**
 * background module.
 *
 * Initialized when browser extension is loaded.
 */

import { doWork } from './shortcuts_for_asana';

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(doWork);
