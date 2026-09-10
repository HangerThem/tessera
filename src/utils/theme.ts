type Theme = "light" | "dark" | "system";

/**
 * Applies the specified theme to the document.
 * 
 * @param theme - The theme to apply ("light", "dark", or "system").
 */
export function applyTheme(theme: Theme): void {
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const isDark = theme === "dark" || (theme === "system" && prefersDark);
	document.documentElement.dataset.theme = isDark ? "dark" : "light";
}

/**
 * Sets the theme preference in localStorage and applies it to the document.
 * 
 * @param theme - The theme to set ("light", "dark", or "system").
 */
export function setTheme(theme: Theme): void {
	if (theme === "system") {
		localStorage.removeItem("theme");
	} else {
		localStorage.setItem("theme", theme);
	}
	applyTheme(theme);
}

/**
 * Retrieves the current theme preference from localStorage.
 * If no preference is set, defaults to "system".
 * 
 * @returns The current theme preference ("light", "dark", or "system").
 */
export function getTheme(): Theme {
	return (localStorage.getItem("theme") as Theme) ?? "system";
}

window.matchMedia("(prefers-color-scheme: dark)")
	.addEventListener("change", () => {
		if (getTheme() === "system") applyTheme("system");
	});

if (typeof window !== "undefined") {
	console.log("Applying theme:", getTheme());
	applyTheme(getTheme());
}