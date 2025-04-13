import { createTheme, ThemeProvider } from "@mui/material/styles";
import React, { createContext, useMemo, useState, useEffect } from "react";
import { pink } from "@mui/material/colors";

export const ColorModeContext = createContext();

export const ThemeContextProvider = ({ children }) => {
    const [mode, setMode] = useState(() => localStorage.getItem("themeMode") || "light");

    useEffect(() => {
        localStorage.setItem("themeMode", mode);
        document.documentElement.setAttribute("data-theme", mode); // CSS için
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
                            primary: { main: "rgb(86, 18, 29)" },
                            secondary: { main: pink[300] },
                            accent: { main: "rgb(169, 29, 52)" },
                            background: { default: "#fafafa", paper: "#ffffff" },
                            text: { primary: "#2d2d2d", secondary: "rgba(0, 0, 0, 0.7)", subtext: "rgba(44, 13, 18, 0.71)" },
                            buttonBg: "rgb(86, 18, 29)",
                            buttonText: "#ffffff",
                            buttonHoverBg: "#ffffff",
                            buttonHoverText: "rgb(86, 18, 29)",
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
                shadows: {
                    ...(mode === "light"
                        ? {
                            1: "0 2px 5px rgba(0, 0, 0, 0.1)",
                            2: "4px 4px 20px rgba(0, 0, 0, 0.2)",
                            3: "2px 1px 0 rgba(0, 0, 0, 0.1)",
                        }
                        : {
                            1: "0 2px 5px rgba(255, 255, 255, 0.1)",
                            2: "0 4px 12px rgba(255, 255, 255, 0.1)",
                            3: "2px 1px 0 rgba(255, 255, 255, 0.1)",
                        }),
                },
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