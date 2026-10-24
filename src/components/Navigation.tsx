"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { landing } from "@/content/landing";
import { Brand } from "./Brand";
import { Action } from "./actions/Actions";
import { Icon } from "./ui/Icon";
export function Navigation({ logo }: { logo: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Brand logo={logo} />
        <nav className="desktop-nav" aria-label="Main navigation">
          {landing.nav.map(([title, id]) => (
            <a href={`#${id}`} key={id}>
              {title}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <Action kind="start" className="nav-start">
            Get Started
          </Action>
          <Action className="button small">
            Book Free Demo
            <Icon name="arrow" size={16} />
          </Action>
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="menu-trigger" aria-label="Open menu">
            <Icon name="menu" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="drawer-overlay" />
            <Dialog.Content className="mobile-drawer">
              <div className="drawer-top">
                <Dialog.Title>{landing.brand}</Dialog.Title>
                <Dialog.Close className="icon-button" aria-label="Close menu">
                  <Icon name="close" />
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">
                Explore Bizgenix AI CRM and book a demo.
              </Dialog.Description>
              <nav aria-label="Mobile navigation">
                {landing.nav.map(([title, id], i) => (
                  <a href={`#${id}`} key={id} onClick={() => setOpen(false)}>
                    <span>0{i + 1}</span>
                    {title}
                    <Icon name="arrow" />
                  </a>
                ))}
              </nav>
              <div onClick={() => setOpen(false)}>
                <Action className="button">
                  Book Free Demo
                  <Icon name="arrow" />
                </Action>
                <Action kind="start" className="button secondary">
                  Get Started
                </Action>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}
