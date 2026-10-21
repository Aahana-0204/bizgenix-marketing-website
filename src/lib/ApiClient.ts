import type { BookingInput, BookingResult, Slot } from "@/shared/schemas";
export class ApiError extends Error { constructor(public readonly code: string, message: string) { super(message); } }
export class ApiClient {
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try { response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" }); }
    catch (error) { if (error instanceof Error && error.name === "AbortError") throw error; throw new ApiError("NETWORK_ERROR", "Unable to connect. Check your connection and try again."); }
    const body = await response.json() as { success: boolean; data: T; error: { code: string; message: string } | null };
    if (!response.ok || !body.success) throw new ApiError(body.error?.code ?? "REQUEST_FAILED", body.error?.message ?? "Please try again.");
    return body.data;
  }
  availability(date: string, signal?: AbortSignal) { return this.request<Slot[]>(`/api/availability?date=${date}`, { signal }); }
  month(month: string, signal?: AbortSignal) { return this.request<string[]>(`/api/availability/month?month=${month}`, { signal }); }
  book(data: BookingInput) { return this.request<BookingResult>("/api/bookings", { method: "POST", body: JSON.stringify(data) }); }
}
export const api = new ApiClient();
