export class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function sendApiError(res, {
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  message = 'Internal server error',
  details,
  requestId,
}) {
  const payload = {
    ok: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    ...(requestId ? { requestId } : {}),
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(payload);
}