/**
 * The icon set, copied verbatim from `src/assets/icons/*.svg`.
 *
 * `source` is injected into the DOM exactly as written, so each string must stay
 * byte-identical to its .svg file — see that folder's README for the required
 * shape of the root element. Adding an entry here extends `ImsIconName`
 * automatically, so a typo at a call site stays a compile error.
 */
export interface ImsIconDefinition {
    /** Human-readable name, used when an instance opts into `label="true"`. */
    readonly label: string;
    /** Complete `<svg>` markup, verbatim from the source file. */
    readonly source: string;
}

export const IMS_ICONS = {
    'add': {
        label: 'Add',
        source: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" focusable="false" aria-hidden="true">
  <title>Add</title>
  <circle class="tint" transform="translate(2 2)" cx="16" cy="16" r="12" fill="var(--icon-tint, #BFC2F4)"></circle>
  <g fill="none" stroke="var(--icon-contour, #000570)" stroke-width="var(--icon-stroke-width, 1.5)" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="16" cy="16" r="12"></circle>
    <path d="M16 10.4v11.2M10.4 16h11.2"></path>
  </g>
</svg>`
    },
    'floppy-disk': {
        label: 'Floppy disk',
        source: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" focusable="false" aria-hidden="true">
  <title>Floppy disk</title>
  <path class="tint" transform="translate(2 2)" d="M6 4h16.4L28 9.6V26a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="var(--icon-tint, #BFC2F4)"></path>
  <path d="M9.4 19.2h13.2V28H9.4zM10 4h9.6v7.6h-9.6z" fill="var(--icon-surface, #fff)"></path>
  <g fill="none" stroke="var(--icon-contour, #000570)" stroke-width="var(--icon-stroke-width, 1.5)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 4h16.4L28 9.6V26a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"></path>
    <path d="M11.2 4v8h9.6V4"></path>
    <path d="M17.6 6v4"></path>
    <path d="M9.4 28v-8.8h13.2V28"></path>
    <path d="M12.2 22.4h7.6M12.2 25.2h4.4"></path>
  </g>
</svg>`
    },
    'list': {
        label: 'List',
        source: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" focusable="false" aria-hidden="true">
  <title>List</title>
  <g class="tint" transform="translate(2 2)" fill="var(--icon-tint, #BFC2F4)">
    <rect x="4" y="5.6" width="5.6" height="5.6" rx="1.4"></rect>
    <rect x="4" y="13.2" width="5.6" height="5.6" rx="1.4"></rect>
    <rect x="4" y="20.8" width="5.6" height="5.6" rx="1.4"></rect>
  </g>
  <g fill="none" stroke="var(--icon-contour, #000570)" stroke-width="var(--icon-stroke-width, 1.5)" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="5.6" width="5.6" height="5.6" rx="1.4"></rect>
    <rect x="4" y="13.2" width="5.6" height="5.6" rx="1.4"></rect>
    <rect x="4" y="20.8" width="5.6" height="5.6" rx="1.4"></rect>
    <path d="M5.6 8.4l1.4 1.4 2.4-2.6"></path>
    <path d="M13.6 6.8H28M13.6 10H23"></path>
    <path d="M13.6 14.4H28M13.6 17.6H23"></path>
    <path d="M13.6 22H28M13.6 25.2H23"></path>
  </g>
</svg>`
    },
    'multi-select': {
        label: 'Multi-select',
        source: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" focusable="false" aria-hidden="true">
  <title>Multi-select</title>
  <g class="tint" transform="translate(2 2)" fill="var(--icon-tint, #BFC2F4)">
    <rect x="4" y="4" width="15.4" height="15.4" rx="3.2"></rect>
    <rect x="12.6" y="12.6" width="15.4" height="15.4" rx="3.2"></rect>
  </g>
  <rect x="12.6" y="12.6" width="15.4" height="15.4" rx="3.2" fill="var(--icon-surface, #fff)"></rect>
  <g fill="none" stroke="var(--icon-contour, #000570)" stroke-width="var(--icon-stroke-width, 1.5)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11.4 19.4H7.2A3.2 3.2 0 0 1 4 16.2V7.2A3.2 3.2 0 0 1 7.2 4h9A3.2 3.2 0 0 1 19.4 7.2v4.2"></path>
    <path d="M7.6 11.2l2.2 2.2 3.8-4"></path>
    <rect x="12.6" y="12.6" width="15.4" height="15.4" rx="3.2"></rect>
    <path d="M16.4 20.4l3.2 3.2 5.4-5.6"></path>
  </g>
</svg>`
    },
    'remove': {
        label: 'Remove',
        source: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" focusable="false" aria-hidden="true">
  <title>Remove</title>
  <circle class="tint" transform="translate(2 2)" cx="16" cy="16" r="12" fill="var(--icon-tint, #BFC2F4)"></circle>
  <g fill="none" stroke="var(--icon-contour, #000570)" stroke-width="var(--icon-stroke-width, 1.5)" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="16" cy="16" r="12"></circle>
    <path d="M10.4 16h11.2"></path>
  </g>
</svg>`
    },
    'search': {
        label: 'Search',
        source: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" focusable="false" aria-hidden="true">
  <title>Search</title>
  <g class="tint" transform="translate(2 2)" fill="var(--icon-tint, #BFC2F4)">
    <circle cx="13.8" cy="13.8" r="9.8"></circle>
    <path d="M20.6 20.6 27 27a1.8 1.8 0 0 1-2.6 2.6L18 23.2Z"></path>
  </g>
  <g fill="none" stroke="var(--icon-contour, #000570)" stroke-width="var(--icon-stroke-width, 1.5)" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="13.8" cy="13.8" r="9.8"></circle>
    <path d="M10.2 8.2a6.4 6.4 0 0 0-2.4 4.4"></path>
    <path d="M20.8 20.8l6 6a1.8 1.8 0 0 0 2.6-2.6l-6-6"></path>
  </g>
</svg>`
    },
    'user': {
        label: 'User',
        source: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" focusable="false" aria-hidden="true">
  <title>User</title>
  <g class="tint" transform="translate(2 2)" fill="var(--icon-tint, #BFC2F4)">
    <circle cx="16" cy="10.6" r="5.8"></circle>
    <path d="M4.6 28c0-5.8 5.1-9.4 11.4-9.4S27.4 22.2 27.4 28Z"></path>
  </g>
  <g fill="none" stroke="var(--icon-contour, #000570)" stroke-width="var(--icon-stroke-width, 1.5)" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="16" cy="10.6" r="5.8"></circle>
    <path d="M4.6 28c0-5.8 5.1-9.4 11.4-9.4S27.4 22.2 27.4 28"></path>
    <path d="M12.6 19.4l3.4 3.2 3.4-3.2M16 22.6V28"></path>
  </g>
</svg>`
    }
} as const satisfies Record<string, ImsIconDefinition>;

/** Every icon available to `<ims-icon>`. A typo here is a compile error. */
export type ImsIconName = keyof typeof IMS_ICONS;

export const IMS_ICON_NAMES = Object.keys(IMS_ICONS) as readonly ImsIconName[];
