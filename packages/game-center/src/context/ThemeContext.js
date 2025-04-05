import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createContext, useMemo, useState } from "react";

export const ColorModeContext = createContext();

export const ThemeContextProvider = ({ children }) => {
    const [mode, setMode] = useState("light");
    const toggleColorMode = () => {
        setMode(prev => (prev === "light" ? "dark" : "light"));
    };

    const theme = useMemo(() => createTheme({
        palette: {
            mode,
            ...(mode === 'light' ? {
                primary: { main: 'rgb(86, 18, 29)' },
                secondary: { main: 'rgba(225, 107, 127, 0.863)' },
                background: { default: '#f5f5f5', paper: '#ffffff' },
                text: { primary: '#333333', secondary: 'rgba(0, 0, 0, 0.7)' },
            } : {
                primary: { main: 'rgb(225, 50, 75)' },
                secondary: { main: 'rgba(255, 127, 147, 0.863)' },
                background: { default: 'rgb(29,30,32)', paper: '#2a2a4a' },
                text: { primary: '#e0e0e0', secondary: '#b0b0b0' },
            }),
        },
    }), [mode]);

    return (
        <ColorModeContext.Provider value={{ toggleColorMode, mode }}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};