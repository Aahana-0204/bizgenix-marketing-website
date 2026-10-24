"use client";
import * as Accordion from "@radix-ui/react-accordion";
import { landing } from "@/content/landing";
import { Icon } from "./ui/Icon";
export function Faq() {
  return (
    <Accordion.Root type="single" collapsible className="faq-list">
      {landing.faqs.map(([question, answer], i) => (
        <Accordion.Item value={String(i)} key={question} className="faq-item">
          <Accordion.Header>
            <Accordion.Trigger>
              {question}
              <Icon name="plus" size={20} />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <p>{answer}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
