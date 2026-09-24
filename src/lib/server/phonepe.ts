import "@tanstack/react-start/server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { getRequiredEnvironment } from "@/lib/server/mongodb";

type PhonePeEnvironment = "sandbox" | "production";

type PhonePeTokenResponse = {
  access_token?: string;
  expires_at?: number;
  expires_in?: number;
};

export type PhonePeOrderStatus = {
  orderId?: string;
  merchantOrderId?: string;
  state?: string;
  amount?: number | string;
  paymentDetails?: Array<{
    transactionId?: string;
    state?: string;
  }>;
};

type PhonePeCheckoutResponse = {
  orderId?: string;
  state?: string;
  redirectUrl?: string;
};

type PhonePeTokenCache = {
  accessToken: string;
  expiresAt: number;
};

type PhonePeGlobals = typeof globalThis & {
  __motoluxePhonePeToken?: PhonePeTokenCache;
};

function getPhonePeEnvironment(): PhonePeEnvironment {
  const environment = process.env["PHONEPE_ENVIRONMENT"] ?? "sandbox";
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("PHONEPE_ENVIRONMENT must be sandbox or production.");
  }
  return environment;
}

function getApiBaseUrl() {
  return getPhonePeEnvironment() === "sandbox"
    ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
    : "https://api.phonepe.com/apis/pg";
}

async function getAccessToken() {
  const globals = globalThis as PhonePeGlobals;
  const cached = globals.__motoluxePhonePeToken;
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.accessToken;

  const environment = getPhonePeEnvironment();
  const url =
    environment === "sandbox"
      ? "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"
      : "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
  const form = new URLSearchParams({
    client_id: getRequiredEnvironment("PHONEPE_CLIENT_ID"),
    client_version: getRequiredEnvironment("PHONEPE_CLIENT_VERSION"),
    client_secret: getRequiredEnvironment("PHONEPE_CLIENT_SECRET"),
    grant_type: "client_credentials",
  });
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(12_000),
  });
  const payload = (await response.json().catch(() => ({}))) as PhonePeTokenResponse;
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error(`PhonePe authorization failed (HTTP ${response.status}).`);
  }

  const expiresAt =
    typeof payload.expires_at === "number"
      ? payload.expires_at * 1000
      : Date.now() + (typeof payload.expires_in === "number" ? payload.expires_in * 1000 : 300_000);
  globals.__motoluxePhonePeToken = { accessToken: payload.access_token, expiresAt };
  return payload.access_token;
}

async function phonePeRequest<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `O-Bearer ${token}`,
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new Error(`PhonePe request failed (HTTP ${response.status}).`);
  return payload;
}

export async function initiatePhonePeCheckout(input: {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
  phoneNumber?: string;
}) {
  const payload: Record<string, unknown> = {
    merchantOrderId: input.merchantOrderId,
    amount: input.amountPaise,
    expireAfter: 1200,
    paymentFlow: {
      type: "PG_CHECKOUT",
      merchantUrls: { redirectUrl: input.redirectUrl },
    },
  };
  if (input.phoneNumber) {
    payload["prefillUserLoginDetails"] = {
      phoneNumber: input.phoneNumber.startsWith("+")
        ? input.phoneNumber
        : `+91${input.phoneNumber}`,
    };
  }

  const response = await phonePeRequest<PhonePeCheckoutResponse>("/checkout/v2/pay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (
    response.state !== "PENDING" ||
    typeof response.redirectUrl !== "string" ||
    typeof response.orderId !== "string"
  ) {
    throw new Error("PhonePe did not return an active checkout session.");
  }
  return { orderId: response.orderId, redirectUrl: response.redirectUrl };
}

export async function getPhonePeOrderStatus(merchantOrderId: string) {
  return phonePeRequest<PhonePeOrderStatus>(
    `/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=false`,
    { method: "GET" },
  );
}

export function verifyPhonePeWebhookAuthorization(authorization: string | null) {
  const username = process.env["PHONEPE_WEBHOOK_USERNAME"];
  const password = process.env["PHONEPE_WEBHOOK_PASSWORD"];
  if (!username || !password || !authorization) return false;

  const expected = createHash("sha256").update(`${username}:${password}`).digest();
  const supplied = Buffer.from(authorization.trim(), "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
