import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentsModalProvider, useDocumentsModal } from './DocumentsModalContext';

function Consumer() {
  const { isOpen, openDocumentsModal, closeDocumentsModal } = useDocumentsModal();
  return (
    <div>
      <div data-testid="is-open">{String(isOpen)}</div>
      <button onClick={() => openDocumentsModal()}>open</button>
      <button onClick={() => closeDocumentsModal()}>close</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <DocumentsModalProvider>
      <Consumer />
    </DocumentsModalProvider>
  );
}

it('starts closed', () => {
  renderProvider();

  expect(screen.getByTestId('is-open')).toHaveTextContent('false');
});

it('opens on openDocumentsModal', async () => {
  const user = userEvent.setup();
  renderProvider();

  await user.click(screen.getByText('open'));

  expect(screen.getByTestId('is-open')).toHaveTextContent('true');
});

it('closes on closeDocumentsModal', async () => {
  const user = userEvent.setup();
  renderProvider();
  await user.click(screen.getByText('open'));

  await user.click(screen.getByText('close'));

  expect(screen.getByTestId('is-open')).toHaveTextContent('false');
});
