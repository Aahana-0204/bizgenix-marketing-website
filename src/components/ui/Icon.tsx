import {
  Users,
  Columns3,
  Clock3,
  ChartNoAxesCombined,
  Mic,
  MessageCircle,
  Sparkles,
  Building2,
  BriefcaseBusiness,
  GraduationCap,
  Factory,
  ArrowUpRight,
  Check,
  ChevronDown,
  Plus,
  X,
  Menu,
  ArrowRight,
  CircleCheck,
  ShieldCheck,
} from "lucide-react";
const icons = {
  users: Users,
  pipeline: Columns3,
  clock: Clock3,
  chart: ChartNoAxesCombined,
  voice: Mic,
  message: MessageCircle,
  sparkles: Sparkles,
  building: Building2,
  briefcase: BriefcaseBusiness,
  education: GraduationCap,
  factory: Factory,
  arrow: ArrowUpRight,
  check: Check,
  down: ChevronDown,
  plus: Plus,
  close: X,
  menu: Menu,
  right: ArrowRight,
  success: CircleCheck,
  shield: ShieldCheck,
};
export function Icon({
  name,
  size = 22,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Component = icons[name as keyof typeof icons] || Sparkles;
  return (
    <Component
      size={size}
      strokeWidth={1.65}
      aria-hidden="true"
      className={className}
    />
  );
}
