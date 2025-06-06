import { createTheme, ThemeProvider } from "@mui/material/styles";
import React, { createContext, useMemo, useState, useEffect } from "react";
import { pink } from "@mui/material/colors";

export const ColorModeContext = createContext();

export const ThemeContextProvider = ({ children }) => {
    const [mode, setMode] = useState(() => localStorage.getItem("themeMode") || "light");

    useEffect(() => {
        localStorage.setItem("themeMode", mode);
        document.documentElement.setAttribute("data-theme", mode);
    }, [mode]);

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
            },
            mode,
        }),
        [mode]
    );

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    ...(mode === "light"
                        ? {
                            primary: { main: "rgb(169, 29, 52)" },
                            secondary: { main: pink[300] },
                            accent: { main: "rgb(169, 29, 52)" },
                            background: { default: "#fafafa", paper: "#ffffff" },
                            text: { primary: "#2d2d2d", secondary: "rgba(0, 0, 0, 0.7)", subtext: "rgba(44, 13, 18, 0.71)" },
                            buttonBg: "rgb(169, 29, 52)",
                            buttonText: "#ffffff",
                            buttonHoverBg: "#ffffff",
                            buttonHoverText: "rgb(169, 29, 52)",
                        }
                        : {
                            primary: { main: "rgb(225, 50, 75)" },
                            secondary: { main: pink[300] },
                            buttonBg: "rgb(225, 50, 75)",
                            accent: { main: "rgb(169, 29, 52)" },
                            background: { default: "rgb(29, 30, 32)", paper: "rgb(29, 30, 32)" },
                            buttonText: "#ffffff",
                            buttonHoverBg: "#ffffff",
                            buttonHoverText: "rgb(225, 50, 75)",
                            text: { primary: "#e0e0e0", secondary: "#b0b0b0", subtext: "rgba(44, 13, 18, 0.71)" },
                        }),
                },
                shadows: Array(25)
                    .fill('none')
                    .map((_, i) => {
                        if (i === 0) return 'none';
                        if (i === 1) return mode === 'light' ? '0 2px 5px rgba(0, 0, 0, 0.1)' : '0 2px 5px rgba(255, 255, 255, 0)';
                        if (i === 2) return mode === 'light' ? '4px 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(255, 255, 255, 0)';
                        if (i === 3) return mode === 'light' ? '2px 1px 0 rgba(0, 0, 0, 0.1)' : '2px 1px 0 rgba(255, 255, 255, 0)';
                        if (i === 8) return mode === 'light' ? '0px 3px 6px rgba(0, 0, 0, 0.3)' : '0px 3px 6px rgba(255, 255, 255, 0)';
                        return mode === 'light' ? `0px ${i}px ${i * 2}px rgba(0, 0, 0, 0.2)` : `0px ${i}px ${i * 2}px rgba(255, 255, 255, 0)`;
                    }),
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                borderRadius: "20px",
                                textTransform: "none",
                                fontFamily: "'Poppins', sans-serif",
                            },
                        },
                    },
                    MuiTab: {
                        styleOverrides: {
                            root: {
                                textTransform: "initial",
                            },
                        },
                    },
                    MuiDialog: {
                        styleOverrides: {
                            paper: {
                                borderRadius: "16px",
                                backgroundColor: mode === "light" ? "#ffffff" : "#2a2a4a",
                            },
                        },
                    },
                },
            }),
        [mode]
    );

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </ColorModeContext.Provider>
    );
};