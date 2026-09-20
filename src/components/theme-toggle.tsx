import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark";

function activeTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => setTheme(activeTheme()), []);

  function toggleTheme() {
    const nextTheme: Theme = activeTheme() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("myio-theme", nextTheme);
    setTheme(nextTheme);
  }

  const nextThemeLabel = theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} title={nextThemeLabel} aria-label={nextThemeLabel}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function ThemeMenuItem() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => setTheme(activeTheme()), []);

  function toggleTheme() {
    const nextTheme: Theme = activeTheme() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("myio-theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <DropdownMenuItem onSelect={toggleTheme}>
      {theme === "dark" ? <Sun /> : <Moon />}
      {theme === "dark" ? "Modo claro" : "Modo escuro"}
    </DropdownMenuItem>
  );
}