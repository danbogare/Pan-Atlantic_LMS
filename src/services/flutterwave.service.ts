// services/flutterwave.service.ts
import { IFlutterwaveConfig } from "../config/env";
import { BadRequestError, ExternalServiceError } from "../errors/error";
import {
  FlutterwaveInitializeData,
  FlutterwaveInitializePayload,
  FlutterwaveResponse,
  FlutterwaveTransaction,
} from "../interfaces/payment.interface";
import { HttpClient, IHttpClient } from "./http.service";

export interface IFlutterwaveService {
  // Creates a hosted checkout (Flutterwave Standard) and returns the link to send the customer to
  initializePayment(payload: FlutterwaveInitializePayload): Promise<string>;
  // Both return null when Flutterwave has no such transaction (e.g. checkout abandoned before paying)
  verifyTransaction(transactionId: string): Promise<FlutterwaveTransaction | null>;
  verifyTransactionByReference(txRef: string): Promise<FlutterwaveTransaction | null>;
}

// Flutterwave v3 REST API, authenticated with the secret key
export class FlutterwaveService implements IFlutterwaveService {
  private readonly http: IHttpClient;

  constructor(config: IFlutterwaveConfig) {
    this.http = new HttpClient({
      serviceName: "Flutterwave",
      // Trailing slash so relative paths resolve under /v3/ whether or not FLW_URI ends with one
      baseURL: config.flwUri.endsWith("/") ? config.flwUri : `${config.flwUri}/`,
      headers: { Authorization: `Bearer ${config.flwSecret}` },
    });
  }

  public async initializePayment(payload: FlutterwaveInitializePayload): Promise<string> {
    const response = await this.http.post<FlutterwaveResponse<FlutterwaveInitializeData>>("payments", payload);
    const link = this.unwrap(response).link;
    if (!link) {
      throw new ExternalServiceError("Flutterwave did not return a payment link");
    }
    return link;
  }

  public async verifyTransaction(transactionId: string): Promise<FlutterwaveTransaction | null> {
    // Flutterwave transaction ids are numeric; reject anything else before building the URL
    if (!/^\d+$/.test(transactionId)) {
      throw new BadRequestError("transaction_id must be numeric");
    }
    return this.findTransaction(() =>
      this.http.get<FlutterwaveResponse<FlutterwaveTransaction>>(`transactions/${transactionId}/verify`)
    );
  }

  public async verifyTransactionByReference(txRef: string): Promise<FlutterwaveTransaction | null> {
    return this.findTransaction(() =>
      this.http.get<FlutterwaveResponse<FlutterwaveTransaction>>("transactions/verify_by_reference", {
        params: { tx_ref: txRef },
      })
    );
  }

  // Flutterwave answers an unknown transaction with a 4xx "No transaction was found"; anything else is a real failure
  private async findTransaction(
    request: () => Promise<FlutterwaveResponse<FlutterwaveTransaction>>
  ): Promise<FlutterwaveTransaction | null> {
    try {
      return this.unwrap(await request());
    } catch (error) {
      const notFound =
        error instanceof ExternalServiceError &&
        (error.upstreamStatus === 400 || error.upstreamStatus === 404) &&
        /no transaction/i.test(error.message);
      if (notFound) return null;
      throw error;
    }
  }

  // Flutterwave can answer 200 with status "error", so check the envelope as well as the HTTP status
  private unwrap<T>(response: FlutterwaveResponse<T>): T {
    if (response?.status !== "success" || !response.data) {
      throw new ExternalServiceError(`Flutterwave: ${response?.message ?? "unexpected response"}`, undefined, response);
    }
    return response.data;
  }
}
