export const DOCUMENT_LINK_SCHEME = 'resource://';

const DOCUMENT_LINK_PATTERN = /\[([^\]]*)\]\(resource:\/\/([^)]+)\)/g;

export function buildDocumentLinkMarkdown(filename: string, resourceId: string): string {
  return `[${filename}](${DOCUMENT_LINK_SCHEME}${resourceId})`;
}

export type DocumentLink = { filename: string; resourceId: string };

export function parseDocumentLinks(content: string): DocumentLink[] {
  return [...content.matchAll(DOCUMENT_LINK_PATTERN)].map(([, filename, resourceId]) => ({ filename, resourceId }));
}

export function isDocumentOnlyContent(content: string): boolean {
  const stripped = content.replace(DOCUMENT_LINK_PATTERN, '').trim();
  return stripped.length === 0 && parseDocumentLinks(content).length > 0;
}
