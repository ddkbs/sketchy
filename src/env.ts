/**
 * Reads a setting from the environment. Hosts pass bundle options the user left
 * unset either as empty strings or as the literal `${user_config.…}`
 * placeholder; both count as unset.
 */
export function setting(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && !value.includes("${user_config.") ? value : undefined;
}
