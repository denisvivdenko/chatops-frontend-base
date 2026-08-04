import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorProvider, useErrorReporter } from './ErrorContext';

let pathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

function Consumer() {
  const { errorMessage, reportError, dismissError } = useErrorReporter();
  return (
    <div>
      <div data-testid="error">{errorMessage || 'none'}</div>
      <button onClick={() => reportError('Something failed', 'details')}>report</button>
      <button onClick={() => dismissError()}>dismiss</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <ErrorProvider>
      <Consumer />
    </ErrorProvider>
  );
}

beforeEach(() => {
  pathname = '/';
});

it('starts with no error message', () => {
  renderProvider();

  expect(screen.getByTestId('error')).toHaveTextContent('none');
});

it('reportError sets the error message', async () => {
  const user = userEvent.setup();
  renderProvider();

  await user.click(screen.getByText('report'));

  expect(screen.getByTestId('error')).toHaveTextContent('Something failed');
});

it('dismissError clears the error message', async () => {
  const user = userEvent.setup();
  renderProvider();
  await user.click(screen.getByText('report'));

  await user.click(screen.getByText('dismiss'));

  expect(screen.getByTestId('error')).toHaveTextContent('none');
});

it('clears the error when the pathname changes', async () => {
  const user = userEvent.setup();
  const { rerender } = renderProvider();
  await user.click(screen.getByText('report'));
  expect(screen.getByTestId('error')).toHaveTextContent('Something failed');

  pathname = '/chat/other';
  rerender(
    <ErrorProvider>
      <Consumer />
    </ErrorProvider>
  );

  expect(screen.getByTestId('error')).toHaveTextContent('none');
});

it('keeps the error when re-rendered with the same pathname', async () => {
  const user = userEvent.setup();
  const { rerender } = renderProvider();
  await user.click(screen.getByText('report'));

  rerender(
    <ErrorProvider>
      <Consumer />
    </ErrorProvider>
  );

  expect(screen.getByTestId('error')).toHaveTextContent('Something failed');
});
