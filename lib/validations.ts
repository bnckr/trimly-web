export function validateRequiredString(value: string, fieldName: string) {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required.`)
  }
}

export function validatePositiveNumber(value: number, fieldName: string) {
  if (Number.isNaN(value) || value < 0) {
    throw new Error(`${fieldName} must be a positive number.`)
  }
}

export function validatePercentage(value: number, fieldName: string) {
  if (Number.isNaN(value) || value < 0 || value > 100) {
    throw new Error(`${fieldName} must be between 0 and 100.`)
  }
}