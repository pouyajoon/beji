import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "../lib/jotai";
import { userSubAtom } from "./atoms";
import { useMessages } from "../i18n/DictionaryProvider";
import LocaleSwitcher from "./LocaleSwitcher";

interface UserInfo {
    userId: string;
    email: string;
    picture?: string;
}

export default function UserMenu() {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const setUserSub = useSetAtom(userSubAtom);
    const { messages } = useMessages<{ UserMenu: { userMenuLabel: string; disconnect: string } }>();
    const userMenuMessages = messages.UserMenu;

    useEffect(() => {
        async function fetchUserInfo() {
            try {
                const response = await fetch("/authentication/oauth/get-token");
                if (response.ok) {
                    const data = await response.json();
                    setUserInfo(data);
                    setUserSub(data.userId);
                } else {
                    // Not authenticated, redirect will happen via proxy
                    setUserInfo(null);
                }
            } catch (error) {
                console.error("Failed to fetch user info:", error);
                setUserInfo(null);
            } finally {
                setIsLoading(false);
            }
        }
        fetchUserInfo();
    }, [setUserSub]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleLogout = async () => {
        try {
            // Call logout endpoint to clear cookie
            await fetch("/authentication/logout", { method: "POST" });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // Clear local state
            setUserSub(null);
            setUserInfo(null);
            // Redirect to login
            navigate("/login");
        }
    };

    if (isLoading || !userInfo) {
        return null;
    }

    const avatarUrl = userInfo.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.email)}&background=000000&color=ffffff&size=128`;

    return (
        <div ref={menuRef} style={{ position: "relative" }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "opacity 0.2s ease",
                }}
                aria-label={userMenuMessages.userMenuLabel}
                aria-expanded={isOpen}
            >
                <img
                    src={avatarUrl}
                    alt={userInfo.email}
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        border: "2px solid currentColor",
                        objectFit: "cover",
                    }}
                />
            </button>

            {isOpen && (
                <>
                    <style>{`
                        .user-menu-dropdown {
                            position: absolute;
                            top: calc(100% + 8px);
                            right: 0;
                            min-width: 200px;
                            border-radius: 8px;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                            z-index: 1000;
                            padding: 0;
                        }
                        @media (prefers-color-scheme: dark) {
                            .user-menu-dropdown {
                                background-color: #1a1a1a;
                                border: 1px solid #333333;
                                color: #ffffff;
                            }
                            .user-menu-interactive {
                                background-color: #2a2a2a;
                            }
                            .user-menu-interactive:hover {
                                background-color: #3a3a3a;
                            }
                        }
                        @media (prefers-color-scheme: light) {
                            .user-menu-dropdown {
                                background-color: #ffffff;
                                border: 1px solid #e5e5e5;
                                color: #000000;
                            }
                            .user-menu-interactive {
                                background-color: #f8f8f8;
                            }
                            .user-menu-interactive:hover {
                                background-color: #f0f0f0;
                            }
                        }
                    `}</style>
                    <div className="user-menu-dropdown">
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid", borderColor: "inherit", opacity: 0.5 }}>
                            <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>
                                {userInfo.email}
                            </div>
                            <div style={{ fontSize: "12px", opacity: 0.7 }}>
                                {userInfo.userId}
                            </div>
                        </div>
                        <div className="user-menu-interactive" style={{ padding: "12px 16px", borderBottom: "1px solid", borderColor: "inherit", transition: "background 0.2s ease" }}>
                            <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "8px", fontWeight: "500" }}>Language</div>
                            <LocaleSwitcher />
                        </div>
                        <button
                            onClick={handleLogout}
                            className="user-menu-interactive"
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: "none",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "14px",
                                transition: "background 0.2s ease",
                                color: "inherit",
                            }}
                        >
                            {userMenuMessages.disconnect}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

