/**
 * The `resource://` markdown-link convention documents are encoded as in `content`,
 * parallel to the `![name](data:image/...)` convention images already use. One shared
 * module owns building and parsing it so the modal, the transcript renderer, and the
 * edit-suppression check can't drift out of sync on the scheme or the regex shape.
 */

export const DOCUMENT_LINK_SCHEME = 'resource://';

const DOCUMENT_LINK_PATTERN = /\[([^\]]*)\]\(resource:\/\/([^)]+)\)/g;

export function buildDocumentLinkMarkdown(filename: string, resourceId: string): string {
  return `[${filename}](${DOCUMENT_LINK_SCHEME}${resourceId})`;
}

export type DocumentLink = { filename: string; resourceId: string };

export function parseDocumentLinks(content: string): DocumentLink[] {
  return [...content.matchAll(DOCUMENT_LINK_PATTERN)].map(([, filename, resourceId]) => ({ filename, resourceId }));
}

/** True when `content` is nothing but document link(s) - used to suppress the edit affordance. */
export function isDocumentOnlyContent(content: string): boolean {
  const stripped = content.replace(DOCUMENT_LINK_PATTERN, '').trim();
  return stripped.length === 0 && parseDocumentLinks(content).length > 0;
}
