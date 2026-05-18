// Primary navigation config, shared by the sidebar and mobile drawer.
import {
  Ear,
  GraduationCap,
  Music,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/train", label: "Train", icon: Ear },
  { href: "/tools", label: "Tools", icon: SlidersHorizontal },
  { href: "/practice", label: "Practice", icon: Music },
  { href: "/profile", label: "Profile", icon: User },
];
