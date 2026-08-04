import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import type { AuthApi } from '../services/authService';

const TOKEN_STORAGE_KEY = 'auth_token'; // mirrors the private constant in AuthContext
const BASE_URL = 'http://localhost:8000/api';

// jsdom in this Vitest setup doesn't implement localStorage, so stub it globally.
const localStorageStore = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  setItem: (key: string, value: string) => { localStorageStore.set(key, value); },
  removeItem: (key: string) => { localStorageStore.delete(key); },
  clear: () => { localStorageStore.clear(); },
});

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const reportError = vi.fn();
vi.mock('./ErrorContext', () => ({
  useErrorReporter: () => ({ reportError }),
}));

const requestFn = vi.fn();
const loginAsAnonymousUser = vi.fn().mockResolvedValue(undefined);
const logout = vi.fn().mockResolvedValue(undefined);
const fakeApi: AuthApi = { request: requestFn, login: vi.fn(), loginAsAnonymousUser, logout };

const createAuthApi = vi.fn().mockResolvedValue(fakeApi);
vi.mock('../services/authService', () => ({
  createAuthApi: (...args: unknown[]) => createAuthApi(...args),
}));

function Consumer() {
  const { logout } = useAuth();
  return (
    <div>
      <div data-testid="ready">ready</div>
      <button onClick={() => logout().catch(() => {})}>logout</button>
    </div>
  );
}

function renderProvider() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const clearSpy = vi.spyOn(queryClient, 'clear');
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    </QueryClientProvider>
  );
  return { ...utils, clearSpy };
}

beforeEach(() => {
  vi.clearAllMocks();
  createAuthApi.mockResolvedValue(fakeApi);
  loginAsAnonymousUser.mockResolvedValue(undefined);
  logout.mockResolvedValue(undefined);
  localStorage.clear();
});

it('renders nothing until the auth api has bootstrapped', async () => {
  let resolveApi: (api: AuthApi) => void = () => {};
  createAuthApi.mockReturnValue(new Promise<AuthApi>((resolve) => { resolveApi = resolve; }));
  renderProvider();

  expect(screen.queryByTestId('ready')).not.toBeInTheDocument();

  await act(async () => resolveApi(fakeApi));

  await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());
});

it('bootstraps with no stored token and logs in anonymously', async () => {
  renderProvider();

  await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());

  expect(createAuthApi).toHaveBeenCalledWith(BASE_URL, null, expect.any(Function), expect.any(Function));
  expect(loginAsAnonymousUser).toHaveBeenCalledTimes(1);
});

it('bootstraps with a stored token and skips anonymous login', async () => {
  localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token');
  renderProvider();

  await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());

  expect(createAuthApi).toHaveBeenCalledWith(BASE_URL, 'stored-token', expect.any(Function), expect.any(Function));
  expect(loginAsAnonymousUser).not.toHaveBeenCalled();
});

it('persists token updates to localStorage, and clears it when the token is empty', async () => {
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());
  const onTokenUpdate = createAuthApi.mock.calls[0][2] as (token: string) => void;

  act(() => onTokenUpdate('new-token'));
  expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('new-token');

  act(() => onTokenUpdate(''));
  expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
});

it('logs in anonymously again when the refresh token is rejected', async () => {
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());
  const onRefreshTokenError = createAuthApi.mock.calls[0][3] as () => void;
  loginAsAnonymousUser.mockClear();

  act(() => onRefreshTokenError());

  expect(loginAsAnonymousUser).toHaveBeenCalledTimes(1);
});

describe('logout', () => {
  it('logs out, re-authenticates anonymously, clears the query cache, and navigates home', async () => {
    const user = userEvent.setup();
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token');
    const { clearSpy } = renderProvider();
    await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());

    await user.click(screen.getByText('logout'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(loginAsAnonymousUser).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('reports an error and does not navigate when logout fails', async () => {
    const user = userEvent.setup();
    logout.mockRejectedValue(new Error('boom'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());

    await user.click(screen.getByText('logout'));

    await waitFor(() => expect(reportError).toHaveBeenCalledWith('Failed to log out', 'boom'));
    expect(push).not.toHaveBeenCalled();
  });
});
