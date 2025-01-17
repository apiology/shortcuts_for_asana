/**
 * shortcuts-for-asana.ts module.
 *
 * Chrome extension which adds missing keyboard shortcuts/behavior to Asana
 */
import { ChromeExtensionPlatform } from './chrome-extension/chrome-extension-platform.js';
import {
  htmlElementBySelector, htmlElementByClass, htmlElementsBySelector, waitForElement,
} from './chrome-extension/dom-utils.js';
import { platform } from './platform.js';

const p = new ChromeExtensionPlatform();
const logger = p.logger();

const findElement = (selector: string): HTMLElement | null => {
  const element = document.querySelector(selector);
  if (element != null) {
    if (!(element instanceof HTMLElement)) {
      throw Error(`Unexpected element type: ${element}`);
    }
    return element;
  }
  return null;
};

const awaitAndClickOnElement = async (selector: string): Promise<void> => {
  const element = await waitForElement(selector, HTMLElement);
  element.click();
};

const clickOnElement = (selector: string): boolean => {
  const l = platform().logger();

  const element = findElement(selector);
  if (element != null) {
    l.debug('Clicking on', element);
    element.click();
    return true;
  }
  l.debug('Could not find element from', selector);

  return false;
};

const dependencyLinks = (): HTMLElement[] => {
  const links: HTMLElement[] = [];
  const bodyNodesClassName = 'CompleteTaskWithIncompletePrecedentTasksConfirmationModal-bodyNode';

  const bodyNodes = Array.from(document.getElementsByClassName(bodyNodesClassName));
  for (const bodyNode of bodyNodes) {
    const linkClassName = 'CompleteTaskWithIncompletePrecedentTasksConfirmationModal-primaryNavigationLink';
    for (const element of Array.from(bodyNode.getElementsByClassName(linkClassName))) {
      if (element instanceof HTMLElement) {
        links.push(element);
      } else {
        throw new Error('Element is not an HTMLElement!');
      }
    }
  }
  return links;
};

// if no dependency dialog, let's pick out links in task descriptions...
//
// (old) .ProsemirrorEditor .BaseLink is either a link to another entity in
// Asana or a link associated with an Asana-integrated application
// (e.g., GitHub) inside the text editor window
// (old) .ProsemirrorEditor .BaseLink is either a link to another entity in
// Asana or a link associated with an Asana-integrated application
// (e.g., GitHub) inside the text editor window
// .ProsemirrorEditor-link is a link to an outside site and does not
// include the BaseLink class as of 2023-02
// Examples:
// (2024-08) <a href="https://www.cnn.com/" class="ProsemirrorEditor-link">https://www.cnn.com/</a>
// (old) <a class="PrimaryNavigationLink BaseLink" href="https://app.asana.com/0/123/456/f">Remove assignee no longer works in shortcuts</a>
// (2024-08) <a class="PrimaryNavigationLink HypertextLink-navigationPill WorkGraphObjectPill-navigationLink" href="https://app.asana.com/0/1205866083602258/1205877552150967">checks-major-reset</a>
// <a target="_blank" rel="noreferrer noopener" class="PrimaryLink AppLinkToken-link BaseLink" href="https://github.com/apiology/shortcuts-for-asana/pull/71">https://github.com/apiology/shortcuts-for-asana/pull/71</a>

const bodyLinks = (): HTMLElement[] => htmlElementsBySelector('.ProsemirrorEditor .BaseLink, .ProsemirrorEditor-link, .ProsemirrorEditor .PrimaryNavigationLink', HTMLElement);
const actionButtons = (): HTMLElement[] => htmlElementsBySelector('#plate-spinner-actions .ActionList [role="button"]', HTMLElement);
const customFieldLinks = (): HTMLElement[] => htmlElementsBySelector('.Stack .CustomPropertyExternalLink-linkIcon', HTMLElement);

const focusOnFirstTask = () => {
  logger.debug('trying to focus on first task');
  const firstTextArea = findElement('textarea.SpreadsheetTaskName-input');
  if (firstTextArea == null) {
    logger.debug('must not be on task list page');
    return;
  }
  logger.debug('first text area', firstTextArea);

  logger.log('Switching to first task');
  // don't switch task if a subtask was marked done
  firstTextArea.click();
};

const removeAssigneeOrCurrentProject = () => {
  const currentProjectGid = window.location.href.split('/')[4];
  // this changes way too often.  put most recently seen on top
  const removeProjectSelectors = [
    `#task_pane_projects_input${currentProjectGid} + div + div .TokenizerPillBase-removeIcon`,
    `#task_pane_projects_input${currentProjectGid} div + div.TokenizerPillBase-removeButton`,
    `#task_pane_projects_input${currentProjectGid} div.TokenizerPillRemoveButton-removeButtonContainer`,
  ];

  // use document.querySelector(selector); against removeProjectSelectors
  const removeProjectButton = removeProjectSelectors
    .map((selector) => document.querySelector(selector))
    .find((element) => element != null);

  logger.debug(`Found ${removeProjectButton} from selectors ${removeProjectSelectors}`);

  if (removeProjectButton != null && removeProjectButton instanceof HTMLElement) {
    removeProjectButton.click();
    focusOnFirstTask();
  } else {
    const element = findElement('.TaskPaneAssigneeToken-removeButton');
    if (element != null) {
      logger.log('Removing assignee');
      element.click();
      focusOnFirstTask();
    }
  }
};

const focusOnFirstTaskIfNotSubtask = () => {
  const classes = document.activeElement?.parentElement?.classList;
  if (classes == null) {
    throw new Error('Could not find element');
  }
  const isOnSubtask = classes.contains('SubtaskTaskRow-taskName');
  logger.debug({ isOnSubtask });
  if (!isOnSubtask) {
    focusOnFirstTask();
  }
};

export const markDependentTaskCompleteSelector = 'div.CompleteTaskWithIncompletePrecedentTasksConfirmationModal div.PrimaryButton';

export const markTaskWithIncompleteDependentsDialogComplete = (e: KeyboardEvent): boolean => {
  logger.debug('trying to click on confirmation modal');
  if (clickOnElement(markDependentTaskCompleteSelector)) {
    focusOnFirstTask();
    // if the element was there and we clicked on it, don't let
    // cmd-enter propagate.  We don't want the underlying task UI
    // 'complete' button to receive it and then reopen the task...
    logger.debug('stopping propagation');
    e.stopPropagation();
    return true;
  }

  // must not be an incomplete dependents dialog
  return false;
};

const moveToFirstTaskAfterTaskMarkedComplete = (e: KeyboardEvent) => {
  logger.debug('got meta enter (before others)');
  if (findElement(markDependentTaskCompleteSelector) != null) {
    // this situation is handled by a different event listener
    logger.debug('stopping propagation');
    e.stopPropagation();
    return;
  }

  // this must be a task without dependents.  Asana will handle the
  // cmd-enter event properly, but we want to be sure to flip back
  // to the first task once it's done.
  focusOnFirstTaskIfNotSubtask();
};

const activateTarget = (num: number, { metaKey }: { metaKey: boolean }) => {
  const dependencies = dependencyLinks();
  if (dependencies.length > 0) {
    const linkFound = dependencies[num - 1];
    logger.debug('linkFound', linkFound);
    if (linkFound != null) {
      linkFound.click();
    }
  } else {
    const cfLinks: { link: HTMLElement }[] = customFieldLinks().map((link) => ({ link }));
    const bLinks: { link: HTMLElement }[] = bodyLinks().map((link) => ({ link }));
    const aButtons: { button: HTMLElement }[] = actionButtons().map((button) => ({ button }));
    const emptyTargets: { button?: HTMLElement, link?: HTMLElement }[] = [];
    const targets = emptyTargets.concat(cfLinks).concat(aButtons).concat(bLinks);

    const targetFound = targets[num - 1];
    logger.debug('linkFound', targetFound);
    if (targetFound != null) {
      if ('button' in targetFound) {
        targetFound.button.click();
      } else if ('link' in targetFound) {
        const { link } = targetFound;

        const url = link.getAttribute('href');
        if (url != null) {
          if (metaKey) {
            logger.debug('opening in new tab');
            window.open(url, '_blank');
          } else {
            logger.debug('normal click on link');
            link.click();
          }
        }
      }
    }
  }
};

const activateProjectTab = (num: number) => {
  const oldSelector = '.ProjectPageHeader-navigationBar .SortableList-sortableItemContainer .ObjectTabNavigationBarItemWithMenuNewUi-selectableTab';
  const selector = '.ProjectPageHeader-navigationBar .SortableList-sortableItemContainer  .ObjectTabNavigationBarItemWithMenu-selectableTab';

  let tabLinks = htmlElementsBySelector(selector, HTMLSpanElement);
  if (tabLinks.length === 0) {
    tabLinks = htmlElementsBySelector(oldSelector, HTMLAnchorElement);
  }
  if (tabLinks.length >= num) {
    const linkFound = tabLinks[num - 1];
    logger.debug('linkFound from', num, linkFound, 'in tabLinks', tabLinks);
    if (linkFound != null) {
      linkFound.click();
    }
  } else {
    logger.debug('Could not find link from ', num, 'in tabLinks', tabLinks);
  }
};

const dismissSearchTaskPane = () => {
  const targetElement = document.querySelector('.FullWidthPageStructureWithDetailsOverlay-detailsOverlay');

  const escapeEvent = new KeyboardEvent('keydown', {
    key: 'Escape',
    code: 'Escape',
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  });

  targetElement?.dispatchEvent(escapeEvent);
};

const clickRefineSearchButton = () => {
  dismissSearchTaskPane();

  clickOnElement('.SearchGridPageToolbar-advancedSearchFiltersAppliedButton');
  clickOnElement('.SearchGridPageToolbar-advancedSearchButton');
  clickOnElement('.SubtleToggleButton:has(svg.FilterMiniIcon)');
};

const clickConvertToSubtaskButton = async () => {
  logger.debug('clicking on extra actions button');
  clickOnElement('.TaskPaneExtraActionsButton');
  logger.debug('waiting for convertTo button to appear');

  const convertTo = await waitForElement(
    '.TaskPaneExtraActionsButton-convertToMenuItem',
    HTMLElement
  );
  logger.debug('hovering over convertTo');
  const convertToRect = convertTo.getBoundingClientRect();
  const convertToX = convertToRect.x + convertToRect.width / 2;
  const convertToY = convertToRect.y + convertToRect.height / 2;
  // send mouse move event
  const mouseMoveEvent = new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX: convertToX,
    clientY: convertToY,
  });
  convertTo.dispatchEvent(mouseMoveEvent);
  logger.debug('clicking convert to subtask button');
  awaitAndClickOnElement('.TaskPaneExtraActionsButton-changeTaskParentDrawerItem');

  const changeTaskParent = htmlElementBySelector('.ChangeTaskParentDrawer input', HTMLElement);
  // send focusin
  const focusInEvent = new FocusEvent('focusin', {
    bubbles: true,
    cancelable: true,
  });
  changeTaskParent.dispatchEvent(focusInEvent);
};

const dismissTaskTime = () => {
  const dueDate = htmlElementByClass('DueDateTokenButton-label', HTMLSpanElement);
  if (dueDate.textContent === 'No due date') {
    return;
  }
  const dismissTaskTimeButton = document.querySelector('.TaskPaneFields-dueDateContainer .TaskDueDateToken-removeButton');
  if ((dismissTaskTimeButton == null) || !(dismissTaskTimeButton instanceof HTMLElement)) {
    return;
  }
  dismissTaskTimeButton.click();
};

const selectTaskTime = async () => {
  clickOnElement('.TaskDueDateToken > div');
  logger.debug('Looking for clock icon...');
  const clockIcon = await waitForElement('.ClockIcon', SVGSVGElement);
  logger.debug('Found clock icon', clockIcon);
  clockIcon?.parentElement?.click();

  const dueTimeViewSelectElement = findElement('#due_time_view_select');
  logger.log('Attempting to set focus on due time on ', dueTimeViewSelectElement);
  dueTimeViewSelectElement?.focus();
};

export const shortcutsKeyDownBeforeOthers = (e: KeyboardEvent) => {
  // this would test for whichever key is 40 (down arrow) and the ctrl key at the same time
  const nonZeroDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  if (nonZeroDigits.includes(e.key)) {
    const num = parseInt(e.key, 10);
    if (!e.metaKey && e.altKey && e.ctrlKey) {
      activateProjectTab(num);
    } else if (e.metaKey && !e.altKey && e.ctrlKey) {
      activateTarget(num, { metaKey: true });
    } else if (!e.metaKey && !e.altKey && e.ctrlKey) {
      activateTarget(num, { metaKey: false });
    }
  } else if (e.metaKey && e.ctrlKey && e.key === 'i') {
    focusOnFirstTask();
  } else if (e.metaKey && e.ctrlKey && e.key === 'r') {
    removeAssigneeOrCurrentProject();
  } else if (e.metaKey && e.key === 'Enter') {
    markTaskWithIncompleteDependentsDialogComplete(e);
    requestIdleCallback(() => {
      // wait for Asana to render the dependent task dialog if it's going to

      // also, if we don't wait until it's marked the task done by processing
      // the event, we'll flip over to the wrong task.  So enqueue this
      // to be done after all current event processing.

      // https://stackoverflow.com/questions/7760428/how-to-run-code-after-all-other-events-have-been-handled

      moveToFirstTaskAfterTaskMarkedComplete(e);
    });
  } else if (e.ctrlKey && e.key === 'r') {
    clickRefineSearchButton();
  } else if (e.ctrlKey && e.key === 's') {
    clickConvertToSubtaskButton();
  } else if (e.ctrlKey && e.key === 't') {
    dismissTaskTime();
    selectTaskTime();
    e.preventDefault(); // don't transpose text
  }
};

export const keyDownOnConfirmationModal = (e: KeyboardEvent) => {
  console.debug('specialized handler just got this event', e);
  if (e.metaKey && e.key === 'Enter') {
    markTaskWithIncompleteDependentsDialogComplete(e);
  }
};
