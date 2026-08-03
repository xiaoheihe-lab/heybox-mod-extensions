export const REDMOD_STEAM_ARGUMENT = '-modded'

export function hasLaunchOptionArgument(launchOptions: unknown, argument = REDMOD_STEAM_ARGUMENT): boolean {
  const expected = String(argument || '').toLowerCase()
  if (!expected) return false
  const value = String(launchOptions || '')
  const tokens: string[] = []
  let token = ''
  let quoted = false
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character === '"') {
      quoted = !quoted
      continue
    }
    if (/\s/.test(character) && !quoted) {
      if (token) tokens.push(token)
      token = ''
      continue
    }
    token += character
  }
  if (token) tokens.push(token)
  return tokens.some((value) => value.toLowerCase() === expected)
}
