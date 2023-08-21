export class StatusError extends Error {
  public name: string;
  public status: number;
  public statusText?: string;
  public isPermanentError: boolean;

  constructor({ status, statusText }: { status: number; statusText: string }) {
    const message = `${status} ${statusText}`;
    super(message);
    this.name = "StatusError";
    this.status = status;
    this.statusText = statusText;
    this.isPermanentError = typeof this.status === "number" &&
      this.status >= 400 && this.status < 500;
  }
}
