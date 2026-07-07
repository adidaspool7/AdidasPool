import { createHash, createHmac, timingSafeEqual } from "crypto";

type InterviewTokenPayload = {
  interviewId: string;
  candidateId: string;
  /**
   * Authenticated Supabase user id (auth.users.id) bound to the token at
   * issuance. The token is only valid when presented by the same user —
   * this prevents replay/leakage across users (audit H5).
   */
  userId: string;
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
  // 30 min: must comfortably outlive the 15-min interview window plus the
  // candidate's setup time (camera/mic permissions, reading the first question),
  // otherwise the runtime token expires mid-interview.
  ttlSeconds = 60 * 30
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
  if (!payload.interviewId || !payload.candidateId || !payload.userId || !payload.exp) {
    throw new Error("Invalid interview runtime token payload");
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Interview runtime token expired");
  }
  return payload;
}

/**
 * Verify a token AND assert that it was issued to the given Supabase user.
 * Throws if the token is invalid/expired or if the user binding doesn't match.
 * Use this in every route that accepts an interview runtime bearer token.
 */
export function verifyInterviewRuntimeTokenForUser(
  token: string,
  expectedUserId: string
): InterviewTokenPayload {
  const payload = verifyInterviewRuntimeToken(token);
  if (payload.userId !== expectedUserId) {
    throw new Error("Interview runtime token does not match authenticated user");
  }
  return payload;
}
