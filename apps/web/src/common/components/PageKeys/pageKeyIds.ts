/** The DOM ids PageKeys generates for one item's tab and panel — use `panelId`/`tabId` to wire a panel's `id`/`aria-labelledby`. */
export function getPageKeyDomIds(idPrefix: string, itemId: string): { tabId: string; panelId: string } {
  return {
    tabId: `${idPrefix}-tab-${itemId}`,
    panelId: `${idPrefix}-panel-${itemId}`,
  }
}
