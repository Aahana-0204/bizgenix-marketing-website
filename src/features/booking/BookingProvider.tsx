"use client";
import dynamic from "next/dynamic";
import { createContext, useContext, useState } from "react";
const BookDemoModal = dynamic(() => import("./BookDemoModal"), { ssr: false });
const BookingContext = createContext<() => void>(() => {});
export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <BookingContext.Provider value={() => setOpen(true)}>{children}{open && <BookDemoModal onClose={() => setOpen(false)} />}</BookingContext.Provider>;
}
export function BookButton({ children = "Book a Demo", className = "button" }: { children?: React.ReactNode; className?: string }) {
  const open = useContext(BookingContext);
  return <button type="button" className={className} onClick={open}>{children}</button>;
}
