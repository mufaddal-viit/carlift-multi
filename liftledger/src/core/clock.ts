/** Today's date in the UAE as YYYY-MM-DD, whatever timezone the device is in. */
export const todayInDubai = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
