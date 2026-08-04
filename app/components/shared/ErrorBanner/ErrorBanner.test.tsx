import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBanner from './ErrorBanner';

const dismissError = vi.fn();
const goHome = vi.fn();
let errorMessage = '';

vi.mock('@/app/context/ErrorContext', () => ({
  useErrorReporter: () => ({ errorMessage, dismissError }),
}));

vi.mock('@/app/hooks/useNavigation', () => ({
  useNavigation: () => ({ goHome }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  errorMessage = '';
});

it('renders nothing when there is no error message', () => {
  const { container } = render(<ErrorBanner />);

  expect(container).toBeEmptyDOMElement();
});

it('renders the error message when present', () => {
  errorMessage = 'Something went wrong';
  render(<ErrorBanner />);

  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});

it('calls goHome when "Go to home" is clicked', async () => {
  errorMessage = 'Something went wrong';
  const user = userEvent.setup();
  render(<ErrorBanner />);

  await user.click(screen.getByRole('button', { name: 'Go to home' }));

  expect(goHome).toHaveBeenCalledTimes(1);
});

it('calls dismissError when "Stay" is clicked', async () => {
  errorMessage = 'Something went wrong';
  const user = userEvent.setup();
  render(<ErrorBanner />);

  await user.click(screen.getByRole('button', { name: 'Stay' }));

  expect(dismissError).toHaveBeenCalledTimes(1);
});
