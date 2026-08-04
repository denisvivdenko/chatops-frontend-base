import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import MessageTextArea from './MessageTextArea';

function ControlledMessageTextArea({
  initialValue = '',
  ...rest
}: Omit<React.ComponentProps<typeof MessageTextArea>, 'value' | 'onChange'> & { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return <MessageTextArea value={value} onChange={setValue} {...rest} />;
}

it('renders the given value', () => {
  render(<MessageTextArea value="hello" onChange={vi.fn()} />);
  expect(screen.getByRole('textbox')).toHaveValue('hello');
});

it('calls onChange with the new value when typing', () => {
  const onChange = vi.fn();
  render(<MessageTextArea value="" onChange={onChange} />);

  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hi' } });

  expect(onChange).toHaveBeenCalledWith('hi');
});

it('submits and prevents the newline on Enter', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<ControlledMessageTextArea initialValue="hello" onSubmit={onSubmit} />);

  const textarea = screen.getByRole('textbox');
  await user.click(textarea);
  await user.keyboard('{Enter}');

  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(textarea).toHaveValue('hello');
});

it('prevents the newline on Enter even when onSubmit is not provided (disableSend)', async () => {
  const user = userEvent.setup();
  render(<ControlledMessageTextArea initialValue="hello" />);

  const textarea = screen.getByRole('textbox');
  await user.click(textarea);
  await user.keyboard('{Enter}');

  expect(textarea).toHaveValue('hello');
});

it('inserts a newline instead of submitting on Shift+Enter', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<ControlledMessageTextArea initialValue="hello" onSubmit={onSubmit} />);

  const textarea = screen.getByRole('textbox');
  await user.click(textarea);
  await user.keyboard('{Shift>}{Enter}{/Shift}');

  expect(onSubmit).not.toHaveBeenCalled();
  expect(textarea).toHaveValue('hello\n');
});

it('calls onCancel on Escape', async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  render(<MessageTextArea value="" onChange={vi.fn()} onCancel={onCancel} />);

  const textarea = screen.getByRole('textbox');
  await user.click(textarea);
  await user.keyboard('{Escape}');

  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('does not error on Escape when onCancel is not provided', async () => {
  const user = userEvent.setup();
  render(<MessageTextArea value="" onChange={vi.fn()} />);

  const textarea = screen.getByRole('textbox');
  await user.click(textarea);
  await user.keyboard('{Escape}');

  expect(textarea).toHaveValue('');
});

it('autofocuses and places the cursor at the end of the value', () => {
  render(<MessageTextArea value="draft" onChange={vi.fn()} autoFocus />);

  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
  expect(textarea).toHaveFocus();
  expect(textarea.selectionStart).toBe('draft'.length);
  expect(textarea.selectionEnd).toBe('draft'.length);
});

it('does not steal focus when autoFocus is not set', () => {
  render(<MessageTextArea value="draft" onChange={vi.fn()} />);
  expect(screen.getByRole('textbox')).not.toHaveFocus();
});

it('resizes the textarea to fit its content as the value grows', () => {
  const original = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'scrollHeight');
  Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', { configurable: true, value: 96 });

  const { rerender } = render(<MessageTextArea value="short" onChange={vi.fn()} />);
  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
  rerender(<MessageTextArea value={'line1\nline2\nline3'} onChange={vi.fn()} />);

  expect(textarea.style.height).toBe('96px');

  if (original) Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', original);
});

it('forwards paste events to onPaste', () => {
  const onPaste = vi.fn();
  render(<MessageTextArea value="" onChange={vi.fn()} onPaste={onPaste} />);

  fireEvent.paste(screen.getByRole('textbox'));

  expect(onPaste).toHaveBeenCalledTimes(1);
});
