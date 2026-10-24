"use client";
import { createContext, useContext, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import type { PublicSite } from "@/config/site";
import { Icon } from "../ui/Icon";
import { getStartedHref, track } from "@/lib/tracking";
const BookingModal = dynamic(() => import("../booking/BookingModal"), {
  ssr: false,
  loading: () => (
    <div className="loading-modal" role="status">
      Preparing your enquiry…
    </div>
  ),
});
type Kind = "demo" | "plan" | "start";
const Context = createContext<{
  open: (kind: Kind, plan?: string) => void;
  config: PublicSite;
} | null>(null);
export function ActionProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: PublicSite;
}) {
  const [intent, setIntent] = useState<{
    kind: "demo" | "plan";
    plan?: string;
  } | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  function open(kind: Kind, plan?: string) {
    trigger.current = document.activeElement as HTMLElement;
    if (kind === "start") {
      track("get_started_click");
      if (config.getStartedUrl) {
        location.assign(getStartedHref(config.getStartedUrl));
        return;
      }
    }
    setIntent({ kind: kind === "demo" ? "demo" : "plan", plan });
  }
  return (
    <Context.Provider value={{ open, config }}>
      {children}
      <Dialog.Root
        open={Boolean(intent)}
        onOpenChange={(value) => {
          if (!value) setIntent(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className="modal-content"
            aria-describedby="modal-description"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus();
            }}
          >
            <Dialog.Close
              className="icon-button modal-close"
              aria-label="Close enquiry"
            >
              <Icon name="close" size={20} />
            </Dialog.Close>
            {intent && (
              <BookingModal
                key={`${intent.kind}:${intent.plan || ""}`}
                kind={intent.kind}
                plan={intent.plan}
                config={config}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Context.Provider>
  );
}
export function Action({
  children,
  kind = "demo",
  plan,
  className = "",
}: {
  children: React.ReactNode;
  kind?: Kind;
  plan?: string;
  className?: string;
}) {
  const context = useContext(Context);
  return (
    <button
      type="button"
      className={className}
      onMouseEnter={() => {
        void import("../booking/BookingModal");
      }}
      onFocus={() => {
        void import("../booking/BookingModal");
      }}
      onClick={() => context?.open(kind, plan)}
    >
      {children}
    </button>
  );
}
