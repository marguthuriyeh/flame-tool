export class ModelError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ModelError";
    this.status = status;
  }
}
