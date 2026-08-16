export class KreaApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, message: string, body = "") {
    super(message);
    this.name = "KreaApiError";
    this.status = status;
    this.body = body;
  }
}

export function isKreaApiError(err: unknown): err is KreaApiError {
  return err instanceof KreaApiError;
}
