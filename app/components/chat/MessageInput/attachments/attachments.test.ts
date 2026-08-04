import { Attachment, buildMessageContent, readFileAsDataUrl, splitContentAndAttachments } from './attachments';

function pngFile(name: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

describe('readFileAsDataUrl', () => {
  it('resolves with the data URL for a file', async () => {
    const dataUrl = await readFileAsDataUrl(pngFile('sock.png'));

    expect(dataUrl).toMatch(/^data:image\/png/);
  });

  it('rejects when the file cannot be read', async () => {
    const file = pngFile('broken.png');
    const originalReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (this: FileReader) {
      this.dispatchEvent(new Event('error'));
    };

    await expect(readFileAsDataUrl(file)).rejects.toBeDefined();

    FileReader.prototype.readAsDataURL = originalReadAsDataURL;
  });
});

describe('splitContentAndAttachments', () => {
  it('returns empty text and no attachments for empty content', () => {
    expect(splitContentAndAttachments('')).toEqual({ text: '', attachments: [] });
  });

  it('leaves plain text untouched when there is no image markdown', () => {
    expect(splitContentAndAttachments('just some text')).toEqual({ text: 'just some text', attachments: [] });
  });

  it('pulls a single image markdown run into an attachment', () => {
    const { text, attachments } = splitContentAndAttachments('![sock.png](data:image/png;base64,abc)');

    expect(text).toBe('');
    expect(attachments).toEqual<Attachment[]>([{ id: 'image-1', name: 'sock.png', dataUrl: 'data:image/png;base64,abc' }]);
  });

  it('uses a null name when the markdown alt text is empty', () => {
    const { attachments } = splitContentAndAttachments('![](data:image/png;base64,abc)');

    expect(attachments[0].name).toBeNull();
  });

  it('extracts multiple images in order and numbers ids starting at 1', () => {
    const content = '![a.png](data:image/png;base64,aaa)\n![b.png](data:image/png;base64,bbb)';
    const { attachments } = splitContentAndAttachments(content);

    expect(attachments.map(a => a.id)).toEqual(['image-1', 'image-2']);
    expect(attachments.map(a => a.name)).toEqual(['a.png', 'b.png']);
  });

  it('keeps surrounding text and trims what remains after removing image markdown', () => {
    const content = '  hello\n![a.png](data:image/png;base64,aaa)\nworld  ';
    const { text, attachments } = splitContentAndAttachments(content);

    expect(text).toBe('hello\n\nworld');
    expect(attachments).toHaveLength(1);
  });

  it('does not match markdown links to non-image data URLs', () => {
    const content = '![file.pdf](data:application/pdf;base64,aaa)';
    const { text, attachments } = splitContentAndAttachments(content);

    expect(text).toBe(content);
    expect(attachments).toEqual([]);
  });
});

describe('buildMessageContent', () => {
  it('returns null when there is no text and no attachments', () => {
    expect(buildMessageContent('', [])).toBeNull();
  });

  it('returns null when text is only whitespace and there are no attachments', () => {
    expect(buildMessageContent('   ', [])).toBeNull();
  });

  it('returns the trimmed text when there are no attachments', () => {
    expect(buildMessageContent('  hello  ', [])).toBe('hello');
  });

  it('builds image markdown for attachments when there is no text', () => {
    const attachments: Attachment[] = [{ id: 'image-1', name: 'sock.png', dataUrl: 'data:image/png;base64,abc' }];

    expect(buildMessageContent('', attachments)).toBe('![sock.png](data:image/png;base64,abc)');
  });

  it('falls back to the id as the markdown label when name is null', () => {
    const attachments: Attachment[] = [{ id: 'image-1', name: null, dataUrl: 'data:image/png;base64,abc' }];

    expect(buildMessageContent('', attachments)).toBe('![image-1](data:image/png;base64,abc)');
  });

  it('joins text and multiple attachments with blank lines, in attachment order', () => {
    const attachments: Attachment[] = [
      { id: 'image-1', name: 'a.png', dataUrl: 'data:image/png;base64,aaa' },
      { id: 'image-2', name: 'b.png', dataUrl: 'data:image/png;base64,bbb' },
    ];

    expect(buildMessageContent('hello', attachments)).toBe(
      'hello\n\n![a.png](data:image/png;base64,aaa)\n![b.png](data:image/png;base64,bbb)'
    );
  });
});
