export function toISODate(date: Date) {
  return date.toISOString().split('T')[0]
}

export function getMonthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)

  return {
    start: toISODate(start),
    end: toISODate(end),
  }
}

export function getWeekRange(reference = new Date()) {
  const date = new Date(reference)
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const start = new Date(date)
  start.setDate(date.getDate() + diffToMonday)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return {
    start: toISODate(start),
    end: toISODate(end),
  }
}