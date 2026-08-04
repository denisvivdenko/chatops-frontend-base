export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export type Attachment = {
  id: string;
  name: string | null;
  dataUrl: string;
};

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const IMAGE_MARKDOWN_PATTERN = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;

/** Pulls `![name](data:...)` runs out of existing content (edit mode) into attachment cards, leaving the rest as plain text. */
export function splitContentAndAttachments(content: string): { text: string; attachments: Attachment[] } {
  const attachments: Attachment[] = [];
  const text = content
    .replace(IMAGE_MARKDOWN_PATTERN, (_match, name: string, dataUrl: string) => {
      attachments.push({ id: `image-${attachments.length + 1}`, name: name || null, dataUrl });
      return '';
    })
    .trim();
  return { text, attachments };
}

export function buildMessageContent(text: string, attachments: Attachment[]): string | null {
  const trimmed = text.trim();
  if (!trimmed && attachments.length === 0) return null;

  const imagesMarkdown = attachments.map(attachment => `![${attachment.name ?? attachment.id}](${attachment.dataUrl})`).join('\n');
  return [trimmed, imagesMarkdown].filter(Boolean).join('\n\n');
}
