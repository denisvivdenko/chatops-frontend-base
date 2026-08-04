import { validateFile } from './documents';

function pdfFile(name: string, bytes: number) {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
}

it('accepts a PDF within the size limit', () => {
  expect(validateFile(pdfFile('report.pdf', 10))).toBeNull();
});

it('accepts a PDF exactly at the 20MB limit', () => {
  expect(validateFile(pdfFile('report.pdf', 20 * 1024 * 1024))).toBeNull();
});

it('rejects a file that is not a PDF', () => {
  const file = new File(['x'], 'photo.png', { type: 'image/png' });

  expect(validateFile(file)).toBe("photo.png isn't a PDF.");
});

it('rejects a PDF over the 20MB limit', () => {
  const file = pdfFile('huge.pdf', 20 * 1024 * 1024 + 1);

  expect(validateFile(file)).toBe('huge.pdf is too large (max 20MB).');
});

it('checks the file type before the size', () => {
  const file = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'huge.png', { type: 'image/png' });

  expect(validateFile(file)).toBe("huge.png isn't a PDF.");
});
