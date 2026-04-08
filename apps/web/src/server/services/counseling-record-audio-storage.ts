import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";

import { ServiceError } from "./service-error";

const R2_REGION = "auto";
const MAX_R2_ATTEMPTS = 3;
const RETRYABLE_R2_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_R2_ERROR_NAMES = new Set([
  "TimeoutError",
  "NetworkingError",
  "InternalError",
  "RequestTimeout",
  "ECONNRESET",
  "EPIPE",
]);

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
};

let cachedClient: {
  cacheKey: string;
  client: S3Client;
  bucketName: string;
} | null = null;

function sanitizeRequiredEnv(
  value: string | undefined,
  envName: string,
  description: string,
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new ServiceError(
      500,
      `${envName} 환경변수가 없어 ${description}를 처리할 수 없습니다.`,
    );
  }

  return trimmed;
}

function getR2Config(): R2Config {
  const accountId = sanitizeRequiredEnv(
    process.env.R2_ACCOUNT_ID,
    "R2_ACCOUNT_ID",
    "R2 저장소 연결",
  );
  const accessKeyId = sanitizeRequiredEnv(
    process.env.R2_ACCESS_KEY_ID,
    "R2_ACCESS_KEY_ID",
    "R2 업로드 인증",
  );
  const secretAccessKey = sanitizeRequiredEnv(
    process.env.R2_SECRET_ACCESS_KEY,
    "R2_SECRET_ACCESS_KEY",
    "R2 업로드 인증",
  );
  const bucketName = sanitizeRequiredEnv(
    process.env.R2_BUCKET_NAME,
    "R2_BUCKET_NAME",
    "상담 음성 저장",
  );
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
  };
}

function getR2Client() {
  const config = getR2Config();
  const cacheKey = [
    config.accountId,
    config.accessKeyId,
    config.bucketName,
    config.endpoint,
  ].join(":");

  if (cachedClient?.cacheKey === cacheKey) {
    return cachedClient;
  }

  const client = new S3Client({
    region: R2_REGION,
    endpoint: config.endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  cachedClient = {
    cacheKey,
    client,
    bucketName: config.bucketName,
  };

  return cachedClient;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableR2Error(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode =
    "$metadata" in error &&
    error.$metadata &&
    typeof error.$metadata === "object" &&
    "httpStatusCode" in error.$metadata
      ? Number(error.$metadata.httpStatusCode)
      : null;

  if (
    typeof statusCode === "number" &&
    RETRYABLE_R2_STATUS_CODES.has(statusCode)
  ) {
    return true;
  }

  const errorName =
    "name" in error && typeof error.name === "string" ? error.name : null;

  return errorName ? RETRYABLE_R2_ERROR_NAMES.has(errorName) : false;
}

function formatStorageErrorMessage(actionLabel: string, error: unknown) {
  if (error instanceof ServiceError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return `${actionLabel}에 실패했습니다. (${error.message.trim()})`;
  }

  return `${actionLabel}에 실패했습니다.`;
}

async function runWithR2Retry<T>(
  actionLabel: string,
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_R2_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableR2Error(error) || attempt === MAX_R2_ATTEMPTS) {
        break;
      }

      await sleep(200 * attempt);
    }
  }

  throw new ServiceError(
    502,
    formatStorageErrorMessage(actionLabel, lastError),
  );
}

async function bodyToBuffer(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new ServiceError(502, "상담 음성 다운로드 응답이 비어 있습니다.");
  }

  if (
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  ) {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks: Uint8Array[] = [];

  for await (const chunk of body as AsyncIterable<
    Uint8Array | Buffer | string
  >) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
      continue;
    }

    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

async function* normalizeBodyChunks(
  body: AsyncIterable<Uint8Array | Buffer | string>,
) {
  for await (const chunk of body) {
    if (typeof chunk === "string") {
      yield Buffer.from(chunk);
      continue;
    }

    yield Buffer.from(chunk);
  }
}

function bodyToWebStream(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new ServiceError(502, "상담 음성 다운로드 응답이 비어 있습니다.");
  }

  if (
    "transformToWebStream" in body &&
    typeof body.transformToWebStream === "function"
  ) {
    return body.transformToWebStream() as ReadableStream<Uint8Array>;
  }

  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream<Uint8Array>;
  }

  if (Symbol.asyncIterator in body) {
    return Readable.toWeb(
      Readable.from(
        normalizeBodyChunks(
          body as AsyncIterable<Uint8Array | Buffer | string>,
        ),
      ),
    ) as ReadableStream<Uint8Array>;
  }

  throw new ServiceError(
    502,
    "상담 음성 스트림을 생성할 수 없는 응답 형식입니다.",
  );
}

export async function uploadCounselingAudioObject(params: {
  objectKey: string;
  bytes: Buffer;
  mimeType: string;
  sha256: string;
}) {
  const { client, bucketName } = getR2Client();

  await runWithR2Retry("상담 음성 업로드", async () => {
    const upload = new Upload({
      client,
      leavePartsOnError: false,
      partSize: 8 * 1024 * 1024,
      queueSize: 3,
      params: {
        Bucket: bucketName,
        Key: params.objectKey,
        Body: params.bytes,
        ContentType: params.mimeType,
        Metadata: {
          sha256: params.sha256,
        },
      },
    });

    await upload.done();
  });
}

export async function downloadCounselingAudioObject(objectKey: string) {
  return downloadCounselingAudioObjectRange({
    objectKey,
  });
}

export async function downloadCounselingAudioObjectRange(params: {
  objectKey: string;
  rangeHeader?: string | null;
}) {
  const { client, bucketName } = getR2Client();

  const response = await runWithR2Retry("상담 음성 다운로드", async () =>
    client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: params.objectKey,
        ...(params.rangeHeader
          ? {
              Range: params.rangeHeader,
            }
          : {}),
      }),
    ),
  );

  if (!response.Body) {
    throw new ServiceError(404, "저장된 상담 음성 파일을 찾지 못했습니다.");
  }

  const bytes = await bodyToBuffer(response.Body);

  return {
    bytes,
    contentLength:
      typeof response.ContentLength === "number"
        ? response.ContentLength
        : bytes.byteLength,
    contentRange: response.ContentRange ?? null,
  };
}

export async function openCounselingAudioObjectStream(params: {
  objectKey: string;
  rangeHeader?: string | null;
}) {
  const { client, bucketName } = getR2Client();

  const response = await runWithR2Retry("상담 음성 다운로드", async () =>
    client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: params.objectKey,
        ...(params.rangeHeader
          ? {
              Range: params.rangeHeader,
            }
          : {}),
      }),
    ),
  );

  if (!response.Body) {
    throw new ServiceError(404, "저장된 상담 음성 파일을 찾지 못했습니다.");
  }

  return {
    stream: bodyToWebStream(response.Body),
    contentLength:
      typeof response.ContentLength === "number"
        ? response.ContentLength
        : null,
    contentRange: response.ContentRange ?? null,
  };
}

export async function deleteCounselingAudioObject(objectKey: string) {
  const { client, bucketName } = getR2Client();

  await runWithR2Retry("상담 음성 정리", async () =>
    client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
    ),
  );
}
