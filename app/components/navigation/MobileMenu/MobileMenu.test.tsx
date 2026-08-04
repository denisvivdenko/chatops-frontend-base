import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileMenu from './MobileMenu';

const logout = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ logout }),
}));

vi.mock('../../../context/ChatContext', () => ({
  useChats: () => ({ chats: [], activeChatId: null, isLoading: false }),
  useChatActions: () => ({ deleteChat: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it('renders the chat list', () => {
  render(<MobileMenu onCloseAction={vi.fn()} />);

  expect(screen.getByRole('link', { name: /new chat/i })).toBeInTheDocument();
});

it('calls onCloseAction when the close button is clicked', async () => {
  const user = userEvent.setup();
  const onCloseAction = vi.fn();
  render(<MobileMenu onCloseAction={onCloseAction} />);

  await user.click(screen.getByRole('button', { name: 'Close menu' }));

  expect(onCloseAction).toHaveBeenCalledTimes(1);
});

it('calls onCloseAction when navigating via a chat link', async () => {
  const user = userEvent.setup();
  const onCloseAction = vi.fn();
  render(<MobileMenu onCloseAction={onCloseAction} />);

  await user.click(screen.getByRole('link', { name: /new chat/i }));

  expect(onCloseAction).toHaveBeenCalledTimes(1);
});

it('arms logout confirmation on first click without logging out', async () => {
  const user = userEvent.setup();
  render(<MobileMenu onCloseAction={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Log out' }));

  expect(screen.getByRole('button', { name: 'Confirm log out' })).toBeInTheDocument();
  expect(logout).not.toHaveBeenCalled();
});

it('logs out on the confirming click', async () => {
  const user = userEvent.setup();
  render(<MobileMenu onCloseAction={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Log out' }));
  await user.click(screen.getByRole('button', { name: 'Confirm log out' }));

  expect(logout).toHaveBeenCalledTimes(1);
});

it('applies the closing class when isClosing is true', () => {
  const { container } = render(<MobileMenu onCloseAction={vi.fn()} isClosing />);

  expect((container.firstChild as HTMLElement).className).toMatch(/closing/);
});

// jsdom has no AnimationEvent, so React falls back to listening for the vendor-prefixed
// "webkitAnimationEnd" native event instead of "animationend" in this environment.
function fireAnimationEnd(target: HTMLElement) {
  target.dispatchEvent(new Event('webkitAnimationEnd', { bubbles: true }));
}

it('calls onAnimationEndAction when the animation ends on the root element', () => {
  const onAnimationEndAction = vi.fn();
  const { container } = render(
    <MobileMenu onCloseAction={vi.fn()} isClosing onAnimationEndAction={onAnimationEndAction} />
  );

  fireAnimationEnd(container.firstChild as HTMLElement);

  expect(onAnimationEndAction).toHaveBeenCalledTimes(1);
});

it('does not call onAnimationEndAction when the animation ends on a child element', () => {
  const onAnimationEndAction = vi.fn();
  render(<MobileMenu onCloseAction={vi.fn()} isClosing onAnimationEndAction={onAnimationEndAction} />);

  fireAnimationEnd(screen.getByRole('button', { name: 'Close menu' }));

  expect(onAnimationEndAction).not.toHaveBeenCalled();
});
