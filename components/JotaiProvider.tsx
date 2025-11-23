import type { ReactNode } from "react";

import { Provider } from "../lib/jotai";

type Props = {
  children: ReactNode;
};

export function JotaiProvider({ children }: Props) {
  return <Provider>{children}</Provider>;
}


