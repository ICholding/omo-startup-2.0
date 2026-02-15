import React from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import Routes from "./Routes";

function App() {
  return (
    <ThemeProvider>
      <Routes />
    </ThemeProvider>
  );
}

export default App;
