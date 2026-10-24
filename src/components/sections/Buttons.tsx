import { Action } from "../actions/Actions";
import { Icon } from "../ui/Icon";
export function Buttons() {
  return (
    <div className="button-pair">
      <Action className="button">
        Book Free Demo
        <Icon name="arrow" size={19} />
      </Action>
      <Action kind="start" className="button secondary">
        Get Started
        <Icon name="right" size={18} />
      </Action>
    </div>
  );
}
