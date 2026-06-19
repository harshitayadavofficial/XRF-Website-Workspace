import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle({ className }) {
  const { theme, toggle } = useTheme();
  return (
    <Button
      data-testid="theme-toggle-btn"
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={className}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
