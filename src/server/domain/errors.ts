export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
}
export class SlotUnavailableError extends AppError {
  readonly status = 409; readonly code = "SLOT_TAKEN";
  constructor() { super("This slot was just booked, please pick another"); }
}
export class ValidationError extends AppError {
  readonly status = 400; readonly code = "VALIDATION_ERROR";
}
export class RateLimitError extends AppError {
  readonly status = 429; readonly code = "DAILY_LIMIT";
  constructor() { super("Daily submission limit reached. Please try again tomorrow."); }
}
