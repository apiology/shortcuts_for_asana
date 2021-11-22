/**
 * shortcuts_for_asana module.
 *
 * Chrome extension which adds missing keyboard shortcuts/behavior to Asana
 */

export const doWork = (tab: chrome.tabs.Tab) => {
  // No tabs or host permissions needed!
  console.log(`Turning ${tab.url} red!`);
  chrome.tabs.executeScript({
    code: 'document.body.style.backgroundColor="red"',
  });
};
export { doWork as default };
