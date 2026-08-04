import { render, screen } from '@testing-library/react';
import type { Message } from '../../../types/chat';
import MessageList from './MessageList';

type VirtuosoProps = {
  data: Message[];
  computeItemKey: (index: number, msg: Message) => string;
  followOutput: (isAtBottom: boolean) => 'auto' | 'smooth' | false;
  itemContent: (index: number, msg: Message) => React.ReactNode;
  components: { Header: React.ComponentType; Footer: React.ComponentType };
};

let capturedProps: VirtuosoProps;

vi.mock('react-virtuoso', () => ({
  Virtuoso: (props: VirtuosoProps) => {
    capturedProps = props;
    const { Header, Footer } = props.components;
    return (
      <div data-testid="virtuoso">
        <Header />
        {props.data.map((msg, index) => (
          <div key={props.computeItemKey(index, msg)}>{props.itemContent(index, msg)}</div>
        ))}
        <Footer />
      </div>
    );
  },
}));

vi.mock('../Message/Message', () => ({
  default: ({ message, editDisabled }: { message: Message; editDisabled?: boolean }) => (
    <div data-testid="message" data-id={message.id} data-edit-disabled={String(editDisabled)} />
  ),
}));

let messages: Message[];
let editingBlocked: boolean;

vi.mock('../../../context/ActiveChatContext', () => ({
  useMessages: () => ({ messages, editingBlocked }),
}));

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'hi',
    status: 'complete',
    createdAt: 0,
    ...overrides,
  };
}

beforeEach(() => {
  messages = [makeMessage({ id: 'a' }), makeMessage({ id: 'b' })];
  editingBlocked = false;
});

it('renders a message item per message, forwarding editingBlocked as editDisabled', () => {
  editingBlocked = true;
  render(<MessageList />);

  const items = screen.getAllByTestId('message');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveAttribute('data-id', 'a');
  expect(items[0]).toHaveAttribute('data-edit-disabled', 'true');
  expect(items[1]).toHaveAttribute('data-id', 'b');
});

it('keys items by message id', () => {
  render(<MessageList />);

  expect(capturedProps.computeItemKey(0, messages[0])).toBe('a');
  expect(capturedProps.computeItemKey(1, messages[1])).toBe('b');
});

describe('followOutput', () => {
  it('scrolls smoothly when at the bottom and editing is not blocked', () => {
    editingBlocked = false;
    render(<MessageList />);

    expect(capturedProps.followOutput(true)).toBe('smooth');
  });

  it('snaps instantly when at the bottom while editing is blocked (streaming)', () => {
    editingBlocked = true;
    render(<MessageList />);

    expect(capturedProps.followOutput(true)).toBe('auto');
  });

  it('does not follow output when not at the bottom', () => {
    render(<MessageList />);

    expect(capturedProps.followOutput(false)).toBe(false);
  });
});
