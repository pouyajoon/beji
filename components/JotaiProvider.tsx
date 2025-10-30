"use client";

import { Provider } from "../lib/jotai";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function JotaiProvider({ children }: Props) {
  return <Provider>{children}</Provider>;
}


