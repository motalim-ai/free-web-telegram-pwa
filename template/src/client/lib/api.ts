// Calls to the Worker API. Inside Telegram the session token lives in memory only; on the website the admin
// session is an HttpOnly cookie the browser sends by itself.
let token: string | null = null;

export const setToken = (value: string | null) => {
  token = value;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  json?: unknown;
  form?: FormData;
}

export async function api<T = unknown>(path: string, { method, json, form }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['content-type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: method ?? (json !== undefined || form ? 'POST' : 'GET'),
      headers,
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('لا يوجد اتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.', 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error ?? 'تعذّر تنفيذ الطلب. حاول مرة أخرى.', response.status);
  return data as T;
}

/** For images behind auth (payment receipts): <img> can't send the Telegram token, so fetch it as a blob. */
export async function authedImageUrl(path: string): Promise<string> {
  const response = await fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'same-origin',
  });
  if (!response.ok) throw new ApiError('تعذّر تحميل الصورة', response.status);
  return URL.createObjectURL(await response.blob());
}
