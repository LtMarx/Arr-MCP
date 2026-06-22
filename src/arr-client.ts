export interface ArrConfig {
  baseUrl: string;
  apiKey: string;
}

export class ArrClient {
  constructor(private config: ArrConfig) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}/api/v3${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "X-Api-Key": this.config.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}
