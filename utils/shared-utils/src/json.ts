function stripJsonComments(input: string): string {
  let output = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    const next = input[i + 1]

    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      output += char
      continue
    }

    if (char === '/' && next === '/') {
      i += 2
      while (i < input.length && input[i] !== '\n' && input[i] !== '\r') i += 1
      i -= 1
      continue
    }

    if (char === '/' && next === '*') {
      i += 2
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1
      if (i >= input.length) throw new Error('Unterminated block comment')
      i += 1
      continue
    }

    output += char
  }

  return output
}

function stripJsonTrailingCommas(input: string): string {
  let output = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]

    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      output += char
      continue
    }

    if (char === ',') {
      let nextIndex = i + 1
      while (nextIndex < input.length && /\s/.test(input[nextIndex])) nextIndex += 1
      if (input[nextIndex] === '}' || input[nextIndex] === ']') continue
    }

    output += char
  }

  return output
}

export function formatJSONPlainText(input: string): string {
  const text = String(input ?? '').replace(/^\uFEFF/, '')
  return stripJsonTrailingCommas(stripJsonComments(text))
}
