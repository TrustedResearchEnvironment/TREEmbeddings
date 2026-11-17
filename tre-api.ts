declare const __TRE_APP_URL__: string;

const APP_URL = __TRE_APP_URL__;
const APP_ORIGIN = new URL(APP_URL).origin;
const TOKEN_REFRESH_MARGIN_MS = 60000;

interface Operation {
    method: 'GET' | 'POST';
    path: string;
    query?: string[];
    bodyParam?: string;
}

const OPERATIONS: Record<string, Operation> = {
    GetDataSetID: { method: 'GET', path: '/api/DataSet/{DataSetID}' },
    GetDatasetIDColumns: { method: 'GET', path: '/api/DataSet/{DataSetID}/columns' },
    GetAssistProjectsFilteredByUpn: { method: 'GET', path: '/api/Request/AssistProjects', query: ['page', 'page_size'] },
    RequestDataSet: { method: 'POST', path: '/api/DataSet/{DataSetID}/Request', bodyParam: 'payload' },
    GetDataSetDateTimeFields: { method: 'GET', path: '/api/DataSetColumns/Datetime/DataSetID/{data_set_id}' },
};

class PopupError extends Error {}

let cachedToken: { token: string; expiresAt: number } | null = null;
let inFlightSignIn: Promise<string> | null = null;

function tokenExpiryMs(jwt: string): number {
    try {
        const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
        return typeof json.exp === 'number' ? json.exp * 1000 : 0;
    } catch {
        return 0;
    }
}

function signIn(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const url = `${APP_URL}/embed-auth.html?origin=${encodeURIComponent(window.location.origin)}`;
        const popup = window.open(url, 'tre-api-auth', 'width=520,height=680');
        if (!popup) {
            reject(new PopupError('Sign-in popup was blocked. Allow popups and try again.'));
            return;
        }

        const cleanup = () => {
            window.removeEventListener('message', onMessage);
            window.clearInterval(poll);
        };
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== APP_ORIGIN || event.data?.type !== 'tre-api-token') return;
            cleanup();
            const token = event.data.token;
            if (typeof token === 'string' && token) resolve(token);
            else reject(new Error('Sign-in did not return a token.'));
        };
        const poll = window.setInterval(() => {
            if (popup.closed) {
                cleanup();
                reject(new PopupError('Sign-in window was closed before completing.'));
            }
        }, 500);

        window.addEventListener('message', onMessage);
    });
}

function promptForSignIn(): Promise<string> {
    return new Promise<string>((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2147483647;';

        const button = document.createElement('button');
        button.textContent = 'Sign in with Microsoft';

        const errorText = document.createElement('div');
        errorText.style.cssText = 'color:#fff;margin-top:12px;';

        overlay.append(button, errorText);
        document.body.appendChild(overlay);

        button.addEventListener('click', () => {
            button.disabled = true;
            errorText.textContent = '';
            signIn()
                .then((token) => {
                    overlay.remove();
                    resolve(token);
                })
                .catch((err: Error) => {
                    errorText.textContent = err.message;
                    button.disabled = false;
                });
        });
    });
}

async function acquireToken(): Promise<string> {
    try {
        return await signIn();
    } catch (err) {
        if (!(err instanceof PopupError)) throw err;
        return promptForSignIn();
    }
}

function getToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS) {
        return Promise.resolve(cachedToken.token);
    }
    if (!inFlightSignIn) {
        inFlightSignIn = acquireToken()
            .then((token) => {
                cachedToken = { token, expiresAt: tokenExpiryMs(token) };
                return token;
            })
            .finally(() => {
                inFlightSignIn = null;
            });
    }
    return inFlightSignIn;
}

function isPresent(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
}

export async function callTreApi(name: string, params: Record<string, any> = {}): Promise<any> {
    const op = OPERATIONS[name];
    if (!op) throw new Error(`Unknown TRE API operation: ${name}`);

    const path = op.path.replace(/\{(\w+)\}/g, (_match, key: string) => {
        if (!isPresent(params[key])) throw new Error(`Missing path parameter "${key}" for ${name}`);
        return encodeURIComponent(String(params[key]));
    });

    const query = new URLSearchParams();
    for (const key of op.query ?? []) {
        if (isPresent(params[key])) query.append(key, String(params[key]));
    }
    const queryString = query.toString();

    const body = op.bodyParam ? params[op.bodyParam] : undefined;
    const token = await getToken();

    const headers: Record<string, string> = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${APP_URL}${path}${queryString ? `?${queryString}` : ''}`, {
        method: op.method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
