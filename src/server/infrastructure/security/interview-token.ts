import { createHash, createHmac, timingSafeEqual } from "crypto";

type InterviewTokenPayload = {
  interviewId: string;
  candidateId: string;
  exp: number;
};

const SECRET = process.env.INTERVIEW_SESSION_TOKEN_SECRET;

function assertSecret(): string {
  if (!SECRET) {
    throw new Error(
      "INTERVIEW_SESSION_TOKEN_SECRET is required for interview runtime token signing"
    );
  }
  return SECRET;
}

function b64url(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64url");
}

function unb64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf-8");
}

function sign(data: string): string {
  return createHmac("sha256", assertSecret()).update(data).digest("base64url");
}

export function hashInterviewToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createInterviewRuntimeToken(
  payload: Omit<InterviewTokenPayload, "exp">,
  ttlSeconds = 60 * 10
): { token: string; expiresAt: Date } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = b64url(JSON.stringify({ ...payload, exp }));
  const signature = sign(body);
  return {
    token: `${body}.${signature}`,
    expiresAt: new Date(exp * 1000),
  };
}

export function verifyInterviewRuntimeToken(token: string): InterviewTokenPayload {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    throw new Error("Invalid interview runtime token format");
  }

  const expected = sign(body);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid interview runtime token signature");
  }

  const payload = JSON.parse(unb64url(body)) as InterviewTokenPayload;
  if (!payload.interviewId || !payload.candidateId || !payload.exp) {
    throw new Error("Invalid interview runtime token payload");
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Interview runtime token expired");
  }
  return payload;
}
