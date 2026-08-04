import { act, renderHook } from '@testing-library/react';
import { useConfirmAction } from './useConfirmAction';

function renderConfirmAction(onConfirm = vi.fn()) {
  const button = document.createElement('button');
  document.body.appendChild(button);
  const ref = { current: button };

  const hook = renderHook(() => useConfirmAction(ref, onConfirm));
  return { ...hook, ref, onConfirm };
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('starts unarmed', () => {
  const { result } = renderConfirmAction();

  expect(result.current.confirming).toBe(false);
});

it('arms on first click without calling onConfirm', async () => {
  const { result, onConfirm } = renderConfirmAction();

  await act(async () => {
    await result.current.handleClick();
  });

  expect(result.current.confirming).toBe(true);
  expect(onConfirm).not.toHaveBeenCalled();
});

it('disarms and calls onConfirm on the second click', async () => {
  const { result, onConfirm } = renderConfirmAction();

  await act(async () => {
    await result.current.handleClick();
  });
  await act(async () => {
    await result.current.handleClick();
  });

  expect(result.current.confirming).toBe(false);
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

it('disarms on a pointerdown outside the ref element', async () => {
  const { result } = renderConfirmAction();

  await act(async () => {
    await result.current.handleClick();
  });
  expect(result.current.confirming).toBe(true);

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });

  expect(result.current.confirming).toBe(false);
});

it('stays armed on a pointerdown inside the ref element', async () => {
  const { result, ref } = renderConfirmAction();

  await act(async () => {
    await result.current.handleClick();
  });

  act(() => {
    ref.current.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });

  expect(result.current.confirming).toBe(true);
});

it('disarms on Escape', async () => {
  const { result } = renderConfirmAction();

  await act(async () => {
    await result.current.handleClick();
  });

  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });

  expect(result.current.confirming).toBe(false);
});
