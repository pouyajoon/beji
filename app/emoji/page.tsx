"use client";

import { Map } from "../../components/Map";

export default function EmojiPage() {
    return (
        <div
            style={{
                height: "100vh",
                width: "100vw",
                margin: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
            }}
        >
            <Map />
        </div>
    );
}

