"use client";
import * as Select from "@radix-ui/react-select";
import { Icon } from "./Icon";
export function FormSelect({
  id,
  value,
  onChange,
  options,
  invalid,
  describedBy,
  onBlur,
}: {
  id: string;
  value?: string;
  onChange: (v: string) => void;
  options: readonly string[];
  invalid?: boolean;
  describedBy?: string;
  onBlur?: () => void;
}) {
  return (
    <Select.Root value={value || ""} onValueChange={onChange}>
      <Select.Trigger
        id={id}
        className="select-trigger"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onBlur={onBlur}
      >
        <Select.Value placeholder="Select an option" />
        <Select.Icon>
          <Icon name="down" size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="select-content"
          position="popper"
          sideOffset={5}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item value={option} key={option} className="select-item">
                <Select.ItemText>{option}</Select.ItemText>
                <Select.ItemIndicator className="select-item-indicator">
                  <Icon name="check" size={13} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
