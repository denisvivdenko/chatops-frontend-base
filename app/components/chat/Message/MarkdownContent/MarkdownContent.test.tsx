import { render, screen } from '@testing-library/react';
import MarkdownContent from './MarkdownContent';

it('renders standard markdown content', () => {
  render(<MarkdownContent content="**bold** and _italic_" />);

  expect(screen.getByText('bold')).toBeInTheDocument();
  expect(screen.getByText('italic')).toBeInTheDocument();
});

it('renders pasted images from data URLs', () => {
  render(<MarkdownContent content="![pasted](data:image/png;base64,aaa)" />);

  expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,aaa');
});

it('renders document links as a non-clickable filename card instead of an anchor', () => {
  render(<MarkdownContent content="[report.pdf](resource://doc-123)" />);

  expect(screen.getByText('report.pdf')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('keeps regular http(s) links as clickable anchors', () => {
  render(<MarkdownContent content="[site](https://example.com)" />);

  expect(screen.getByRole('link', { name: 'site' })).toHaveAttribute('href', 'https://example.com');
});

it('strips unsafe URL schemes, leaving no navigable link', () => {
  render(<MarkdownContent content="[bad](javascript:alert(1))" />);

  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
