/**
 * content-script.ts module.
 *
 * Chrome extension which adds missing keyboard shortcuts/behavior to Asana
 */

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

const clickOnElement = (selector: string): void => {
  const element = findElement(selector);
  if (element != null) {
    element.click();
  }
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
// .PrimaryNavigationLink is a link to another entity in Asana
// .ProsemirrorEditor-link is a link to an outside site
const bodyLinks = () => Array.from(document.querySelectorAll('.PrimaryNavigationLink,.ProsemirrorEditor-link'));

const focusOnFirstTask = () => {
  console.log('trying to focus on first task');
  const firstTextArea = findElement('textarea.SpreadsheetTaskName-input');
  if (firstTextArea == null) {
    throw new Error('Invalid text area');
  }
  console.log('first text area', firstTextArea);

  // don't switch task if a subtask was marked done
  firstTextArea.click();
};

const removeAssignee = () => {
  console.log('trying to remove assignee');
  const element = findElement('div.RemoveButton');
  if (element != null) {
    element.click();
    focusOnFirstTask();
  }
};

const markTaskWithIncompleteDependentsDialogComplete = () => {
  console.log('got meta enter (before others)');
  const markCompleteSelector = 'div.CompleteTaskWithIncompletePrecedentTasksConfirmationModal div.PrimaryButton';
  clickOnElement(markCompleteSelector);
};

const openLink = (num: number) => {
  const dependencies = dependencyLinks();
  if (dependencies.length > 0) {
    const linkFound = dependencies[num - 1];
    console.log('linkFound', linkFound);
    if (linkFound != null) {
      linkFound.click();
    }
  } else {
    const links = bodyLinks();
    const linkFound = links[num - 1];
    console.log('linkFound', linkFound);
    if (linkFound != null) {
      const url = linkFound.getAttribute('href');
      if (url != null) {
        window.open(url, '_blank');
      }
    }
  }
};

const clickRefineSearchButton = () => {
  clickOnElement('.SearchGridPageToolbar-advancedSearchButton');
};

const selectTaskTime = () => {
  clickOnElement('.TaskDueDateToken > div');
  const clockIcon = document.querySelector('.ClockIcon');
  clockIcon?.parentElement?.click();
  findElement('#due_time_view_select')?.focus();
};

console.log('Defining shortcutsKeyDownBeforeOthers');
const shortcutsKeyDownBeforeOthers = (e: KeyboardEvent) => {
  // this would test for whichever key is 40 (down arrow) and the ctrl key at the same time
  const nonZeroDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  if (e.metaKey && e.ctrlKey && nonZeroDigits.includes(e.key)) {
    const num = parseInt(e.key, 10);
    openLink(num);
  } else if (e.metaKey && e.ctrlKey && e.key === 'r') {
    removeAssignee();
  } else if (e.metaKey && e.key === 'Enter') {
    markTaskWithIncompleteDependentsDialogComplete();
  } else if (e.ctrlKey && e.key === 'r') {
    clickRefineSearchButton();
  } else if (e.ctrlKey && e.key === 't') {
    console.log('selectTaskTime()');
    selectTaskTime();
  }
};

const markTaskComplete = () => {
  console.log('got meta enter (after others)');
  const element = findElement('div.CompleteTaskWithIncompletePrecedentTasksConfirmationModal');
  if (element == null) {
    // don't switch task if the cmd-enter key created a modal
    const classes = document.activeElement?.parentElement?.classList;
    if (classes == null) {
      throw new Error('Could not find element');
    }
    const isOnSubtask = classes.contains('SubtaskTaskRow-taskName');
    console.log({ isOnSubtask });
    if (!isOnSubtask) {
      focusOnFirstTask();
    }
  }
};

console.log('Defining shortcutsKeyDownAfterOthers');
const shortcutsKeyDownAfterOthers = (e: KeyboardEvent) => {
  if (e.metaKey && e.key === 'Enter') {
    markTaskComplete();
  }
};

// capture: true ensures that we can differentiate between the
// cmd-enter key event when the dependent dialog is initially brought
// up, and when it was already up and the user wants to confirm to
// close the task.
document.addEventListener('keydown', shortcutsKeyDownBeforeOthers, { capture: true });
console.log('Registered keydown listener', shortcutsKeyDownBeforeOthers);

document.addEventListener('keydown', shortcutsKeyDownAfterOthers, { capture: false });
console.log('Registered keydown listener', shortcutsKeyDownAfterOthers);