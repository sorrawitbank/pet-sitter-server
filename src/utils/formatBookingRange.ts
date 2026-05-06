 function formatBookingRange(startTime: string, endTime: string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
  
    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
  
    const dateFormatter = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
    });
  
    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: undefined,
      hour12: true,
    });
  
    const startDateStr = dateFormatter.format(start); // e.g. "25 Aug"
    const startTimeStr = timeFormatter.format(start); // e.g. "7 AM"
    const endTimeStr = timeFormatter.format(end);     // e.g. "10 AM"
  
    if (sameDay) {
      // 25 Aug, 7 AM - 10 AM
      return `${startDateStr}, ${startTimeStr} - ${endTimeStr}`;
    }
  
    const endDateStr = dateFormatter.format(end);
    // 25 Aug, 7 AM - 26 Aug, 10 AM (ดีไซน์ตอน end คนละวัน)
    return `${startDateStr}, ${startTimeStr} - ${endDateStr}, ${endTimeStr}`;
  }

  export default formatBookingRange;