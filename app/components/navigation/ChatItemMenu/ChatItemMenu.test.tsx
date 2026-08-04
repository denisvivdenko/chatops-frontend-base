import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatItemMenu from './ChatItemMenu';

function renderMenu(onDeleteAction = vi.fn()) {
  render(<ChatItemMenu onDeleteAction={onDeleteAction} />);
  return { onDeleteAction };
}

function getTrigger() {
  return screen.getByRole('button', { name: 'Chat options' });
}

it('renders the trigger with the menu closed', () => {
  renderMenu();

  expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('opens the menu on click and closes it on a second click', async () => {
  const user = userEvent.setup();
  renderMenu();

  await user.click(getTrigger());
  expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('menu')).toBeInTheDocument();

  await user.click(getTrigger());
  expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('closes the menu when clicking outside', async () => {
  const user = userEvent.setup();
  renderMenu();

  await user.click(getTrigger());
  expect(screen.getByRole('menu')).toBeInTheDocument();

  await user.click(document.body);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('closes the menu on Escape', async () => {
  const user = userEvent.setup();
  renderMenu();

  await user.click(getTrigger());
  expect(screen.getByRole('menu')).toBeInTheDocument();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('arms delete confirmation on first click without calling onDeleteAction', async () => {
  const user = userEvent.setup();
  const { onDeleteAction } = renderMenu();

  await user.click(getTrigger());
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

  expect(screen.getByRole('menuitem', { name: 'Confirm delete' })).toBeInTheDocument();
  expect(onDeleteAction).not.toHaveBeenCalled();
});

it('calls onDeleteAction and closes the menu on the confirming click', async () => {
  const user = userEvent.setup();
  const { onDeleteAction } = renderMenu();

  await user.click(getTrigger());
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
  await user.click(screen.getByRole('menuitem', { name: 'Confirm delete' }));

  expect(onDeleteAction).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('resets delete confirmation when the menu is closed and reopened', async () => {
  const user = userEvent.setup();
  renderMenu();

  await user.click(getTrigger());
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
  await user.click(document.body);

  await user.click(getTrigger());
  expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
});
