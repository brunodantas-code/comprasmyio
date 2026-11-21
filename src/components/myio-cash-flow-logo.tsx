import { MyioAppLogo } from "@/components/myio-app-logo";

type Props = {
  className?: string;
  tone?: "light" | "dark" | "auto";
};

export function MyioCashFlowLogo({ className, tone = "auto" }: Props) {
  return <MyioAppLogo appName="Cash Flow" className={className} tone={tone} />;
}
