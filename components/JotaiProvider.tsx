import { Provider } from "../lib/jotai";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function JotaiProvider({ children }: Props) {
  return <Provider>{children}</Provider>;
}


