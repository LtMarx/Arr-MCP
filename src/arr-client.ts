import { log } from "./logger.js";

export interface ArrConfig {
  baseUrl: string;
  apiKey: string;
  apiVersion?: "v1" | "v3";
  serviceName?: string;
}

export class ArrClient {
  private apiBase: string;
  private serviceName: string;

  constructor(private config: ArrConfig) {
    this.apiBase = `/api/${config.apiVersion ?? "v3"}`;
    this.serviceName = config.serviceName ?? "arr";
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${this.apiBase}${path}`;
    const method = options.method ?? "GET";
    const start = Date.now();

    log.debug("api request", { service: this.serviceName, method, path });

    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          "X-Api-Key": this.config.apiKey,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error("api unreachable", { service: this.serviceName, method, path, error: message });
      throw new Error(`Cannot reach ${this.serviceName} at ${this.config.baseUrl}: ${message}`);
    }

    const ms = Date.now() - start;

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      log.error("api error", { service: this.serviceName, method, path, status: res.status, ms, body: text.slice(0, 200) });
      throw new Error(`${this.serviceName} ${method} ${path} → ${res.status} ${res.statusText}: ${text}`);
    }

    log.debug("api response", { service: this.serviceName, method, path, status: res.status, ms });
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
