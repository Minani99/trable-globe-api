type TravelActionIconName = "schedule" | "photo" | "note" | "edit" | "save";

export function TravelActionIcon({ name }: { name: TravelActionIconName }) {
  if (name === "schedule") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
  }
  if (name === "photo") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.7" /><path d="m5.5 17 4.3-4 2.9 2.5 2.4-2.2 3.4 3.7" /></svg>;
  }
  if (name === "note") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 4.5h14v15H5z" /><path d="M8 9h8M8 12.5h8M8 16h5" /></svg>;
  }
  if (name === "edit") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 16.5-.7 3.2 3.2-.7L18.2 8.3l-2.5-2.5L5 16.5Z" /><path d="m14.5 7 2.5 2.5M4 4.5h7M4 9h5" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4.2 4.2L19 6.5" /></svg>;
}
