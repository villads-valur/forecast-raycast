/**
 * Get the current date and time minus a specified number of hours in the format YYYYMMDDTHHMMSS.
 * @param {number} hours - The number of hours to subtract from the current time.
 * @returns {string} - The formatted date string.
 */
export function getFormattedDateMinusHours(hours: number): string {
  // Get the current date and time
  const now = new Date();

  // Subtract the specified number of hours
  const adjustedTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

  // Format the date and time using toLocaleString
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // Use 24-hour format
    timeZone: "UTC", // Optional: set to UTC if needed
  };

  // Get the locale string
  const localeString = adjustedTime.toLocaleString("sv-SE", options); // 'sv-SE' for Swedish format (YYYY-MM-DD HH:mm:ss)

  // Split the date and time
  const [datePart, timePart] = localeString.split(" ");

  // Format the final output
  const formattedDate = datePart.replace(/-/g, "") + "T" + timePart.replace(/:/g, "");

  return formattedDate;
}
