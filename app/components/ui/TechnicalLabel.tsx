import type { ReactNode } from "react";

export default function TechnicalLabel({ number, children }: { number: string; children: ReactNode }) {
  return <div className="p-section-label"><span>{number}</span><i />{children}</div>;
}
