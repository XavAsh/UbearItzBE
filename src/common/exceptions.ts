export type ProblemDetails = {
  type: string;
  title: string;
  detail: string;
  status: number;
};

const defaultTypes = {
  badRequest: "https://example.com/problems/bad-request",
  unauthorized: "https://example.com/problems/unauthorized",
  forbidden: "https://example.com/problems/forbidden",
  notFound: "https://example.com/problems/not-found",
  conflict: "https://example.com/problems/conflict",
} as const;

export class HttpError extends Error {
  public readonly status: number;
  public readonly type: string;
  public readonly title: string;
  public readonly detail: string;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.status = problem.status;
    this.type = problem.type;
    this.title = problem.title;
    this.detail = problem.detail;
  }
}

export function problem(status: number, title: string, detail: string, type = "about:blank"): HttpError {
  return new HttpError({ type, title, detail, status });
}

export class BadRequest extends HttpError {
  constructor(detail: string, type: string = defaultTypes.badRequest) {
    super({ type, title: "Bad Request", detail, status: 400 });
  }
}

export class Unauthorized extends HttpError {
  constructor(detail: string, type: string = defaultTypes.unauthorized) {
    super({ type, title: "Unauthorized", detail, status: 401 });
  }
}

export class Forbidden extends HttpError {
  constructor(detail: string, type: string = defaultTypes.forbidden) {
    super({ type, title: "Forbidden", detail, status: 403 });
  }
}

export class NotFound extends HttpError {
  constructor(detail: string, type: string = defaultTypes.notFound) {
    super({ type, title: "Not Found", detail, status: 404 });
  }
}

export class ConflictError extends HttpError {
  constructor(detail: string, type: string = defaultTypes.conflict) {
    super({ type, title: "Conflict", detail, status: 409 });
  }
}

