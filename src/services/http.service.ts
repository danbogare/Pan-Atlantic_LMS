// services/http.service.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { ExternalServiceError } from "../errors/error";

export interface IHttpClientConfig {
  baseURL: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  // Shown in error messages so failures name the upstream service
  serviceName: string;
}

export interface IHttpClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T>;
  put<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T>;
  patch<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

const DEFAULT_TIMEOUT_MS = 30_000;

// Thin axios wrapper for third-party REST APIs: returns the response body and turns
// transport/HTTP failures into ExternalServiceError so callers handle one error type.
export class HttpClient implements IHttpClient {
  private readonly client: AxiosInstance;

  constructor(private readonly config: IHttpClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...config.headers,
      },
    });
  }

  public get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  public post<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "POST", url, data: body });
  }

  public put<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "PUT", url, data: body });
  }

  public patch<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "PATCH", url, data: body });
  }

  public delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "DELETE", url });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      throw this.toServiceError(error);
    }
  }

  private toServiceError(error: unknown): ExternalServiceError {
    const name = this.config.serviceName;

    if (!axios.isAxiosError(error)) {
      return new ExternalServiceError(`${name} request failed`);
    }

    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response) {
      const upstreamMessage = axiosError.response.data?.message;
      return new ExternalServiceError(
        upstreamMessage ? `${name}: ${upstreamMessage}` : `${name} request failed with status ${axiosError.response.status}`,
        axiosError.response.status,
        axiosError.response.data
      );
    }

    // No response: timeout, DNS failure, connection refused, etc.
    return new ExternalServiceError(`${name} is unreachable, please try again later`);
  }
}
