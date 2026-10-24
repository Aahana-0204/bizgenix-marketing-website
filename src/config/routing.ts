import { env } from "./server";
export const routing = {
  qualifier: env.ROUTE_QUALIFIER_EMAIL,
  presenters: (env.ROUTE_PRESENTER_EMAILS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  closing: (env.ROUTE_CLOSING_EMAILS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
};
/** Closing recipients are deliberately excluded before post-demo handover. */
export function recipients(
  kind: "lead" | "booking",
  presenter?: string | null,
) {
  return [
    ...new Set(
      [
        routing.qualifier,
        ...(kind === "booking"
          ? presenter && routing.presenters.includes(presenter)
            ? [presenter]
            : routing.presenters
          : []),
      ].filter((v): v is string => Boolean(v)),
    ),
  ];
}
