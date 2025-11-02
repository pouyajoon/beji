"use client";

import { useState, cloneElement } from "react";
import {
    useFloating,
    offset,
    flip,
    shift,
    autoUpdate,
    useHover,
    useDismiss,
    useRole,
    useInteractions,
    FloatingPortal,
} from "@floating-ui/react";

type TooltipProps = {
    label: string;
    children: React.ReactElement;
};

export function Tooltip({ label, children }: TooltipProps) {
    const [open, setOpen] = useState(false);
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "top",
        whileElementsMounted: autoUpdate,
        middleware: [offset(8), flip(), shift({ padding: 8 })],
    });

    const hover = useHover(context, { move: false, restMs: 50 });
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "tooltip" });
    const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role]);

    // getReferenceProps returns Record<string, unknown> which is compatible with React props
    // Type assertion is necessary because floating-ui returns Record<string, unknown>
    // but cloneElement expects a more specific props type. This is safe because
    // floating-ui guarantees the props are valid React HTMLAttributes.
    const referenceProps = getReferenceProps({ 
        ref: refs.setReference
    }) as React.HTMLAttributes<HTMLElement>;
    const referenceEl = cloneElement(children, referenceProps);

    return (
        <>
            {referenceEl}

            <FloatingPortal>
                {open && (
                    <div
                        ref={refs.setFloating}
                        style={{
                            ...floatingStyles,
                            zIndex: 1000,
                            pointerEvents: "none",
                            background: "rgba(17,24,39,0.95)",
                            color: "#fff",
                            fontSize: 12,
                            lineHeight: 1.2,
                            padding: "6px 8px",
                            borderRadius: 6,
                            boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
                            maxWidth: 260,
                        }}
                        {...getFloatingProps()}
                    >
                        {label}
                    </div>
                )}
            </FloatingPortal>
        </>
    );
}


