# Shortcuts for Asana

[![CircleCI](https://circleci.com/gh/apiology/shortcuts-for-asana.svg?style=svg)](https://circleci.com/gh/apiology/shortcuts-for-asana)

Chrome extension which adds missing keyboard shortcuts/behavior to Asana.

[![Available in the Chrome Web Store](https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/tbyBjqi7Zu733AAKA5n4.png)](https://chrome.google.com/webstore/detail/shortcuts-for-asana/oaofildmfdagenngppcgdgmonboohjil)

## Using

### Tasks

* Remove the assignee of a task using cmd-ctrl-r.
* Assign the time of a task with ctrl-t

### Task List

When you mark a task complete using cmd-enter in the task list view,
Shortcuts for Asana will return your focus to the first open task.

## Search Results

ctrl-r will click the 'Refine search' button.

### Task Description

If you have links within a task description, Shortcuts for Asana adds
keyboard shortcuts for those tasks:

* cmd-ctrl-1: open the first link in a new tab
* cmd-ctrl-2...: etc

<img src="./docs/screenshot-1.png" alt="screenshot showing Asana task description and repeating above keystrokes" height="400"/>

### Dependent Task Dialog

If you mark a task done which has dependent tasks, links to those
tasks appear in the warning dialog.  Shortcuts for Asana adds keyboard
shortcuts for those tasks:

* cmd-ctrl-1: click on first task in the dependent task warning dialog.
* cmd-ctrl-2...: etc
* cmd-enter: mark the original task as complete and close the dialog.

(see [Upvoter for
Asana](https://github.com/apiology/upvoter-for-asana) for an
interesting use for these links!)

<img src="./docs/screenshot-2.png" alt="screenshot showing Asana dependent task dialog while closing a task and repeating above keystrokes" height="400"/>

## Legal

Not created, maintained, reviewed, approved, or endorsed by Asana, Inc.
