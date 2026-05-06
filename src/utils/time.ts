// convert UTC -> UTC+7
export function toUTC7(dateStr: string) {
  const date = new Date(dateStr);
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}

export function formatTime(date: Date) {
  return date.toISOString().substring(11, 16);
}

export function toThailandDateTime(dateStr: string, isEndOfDay: boolean) {
  const time = isEndOfDay ? "23:59:59" : "00:00:00";

  // Interpret as time in Thailand (UTC+7) then convert to ISO string
  return new Date(`${dateStr}T${time}+07:00`).toISOString();
}
