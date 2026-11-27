import { MyioAppLogo } from "@/components/myio-app-logo";

type Props = {
  className?: string;
  tone?: "light" | "dark" | "auto";
};

export function MyioCashFlowLogo({ className, tone }: Props) {
  return <MyioAppLogo appName="Finance" className={className} {...(tone ? { tone } : {})} />;
}
