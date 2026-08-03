import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentsModalProvider, useDocumentsModal } from '../../../../context/DocumentsModalContext';
import AddAttachmentMenu from './AddAttachmentMenu';

function renderMenu(onPickImages = vi.fn()) {
  render(
    <DocumentsModalProvider>
      <AddAttachmentMenu onPickImages={onPickImages} />
    </DocumentsModalProvider>
  );
  return { onPickImages };
}

function getAddButton() {
  return screen.getByRole('button', { name: /add attachment/i });
}

it('renders the add button with the menu closed', () => {
  renderMenu();

  expect(getAddButton()).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('opens the menu on click and closes it on a second click', async () => {
  const user = userEvent.setup();
  renderMenu();

  await user.click(getAddButton());
  expect(getAddButton()).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('menu')).toBeInTheDocument();

  await user.click(getAddButton());
  expect(getAddButton()).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('closes the menu when clicking outside', async () => {
  const user = userEvent.setup();
  renderMenu();

  await user.click(getAddButton());
  expect(screen.getByRole('menu')).toBeInTheDocument();

  await user.click(document.body);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('closes the menu on Escape', async () => {
  const user = userEvent.setup();
  renderMenu();

  await user.click(getAddButton());
  expect(screen.getByRole('menu')).toBeInTheDocument();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('closes the menu and forwards picked files when choosing Image', async () => {
  const user = userEvent.setup();
  const { onPickImages } = renderMenu();

  await user.click(getAddButton());
  await user.click(screen.getByRole('menuitem', { name: /image/i }));

  expect(screen.queryByRole('menu')).not.toBeInTheDocument();

  const file = new File(['image-bytes'], 'sock.png', { type: 'image/png' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(fileInput, file);

  expect(onPickImages).toHaveBeenCalledWith([file]);
  expect(fileInput.value).toBe('');
});

it('closes the menu and opens the documents modal when choosing Document', async () => {
  const user = userEvent.setup();

  function DocumentsModalState() {
    const { isOpen } = useDocumentsModal();
    return <div data-testid="documents-modal-state">{String(isOpen)}</div>;
  }

  function Wrapper() {
    return (
      <>
        <AddAttachmentMenu onPickImages={vi.fn()} />
        <DocumentsModalState />
      </>
    );
  }

  render(
    <DocumentsModalProvider>
      <Wrapper />
    </DocumentsModalProvider>
  );

  await user.click(getAddButton());
  await user.click(screen.getByRole('menuitem', { name: /document/i }));

  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(screen.getByTestId('documents-modal-state')).toHaveTextContent('true');
});
