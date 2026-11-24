import { toast } from "sonner";
/**
 * Institutional State Sharing Utility
 * Encodes application state into URL hashes for collaboration.
 */
export function generateShareLink(state: Record<string, any>): string {
  try {
    const jsonStr = JSON.stringify(state);
    const encoded = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.href);
    url.hash = `share=${encoded}`;
    return url.toString();
  } catch (err) {
    console.error("Failed to generate share link", err);
    return window.location.href;
  }
}
export function parseShareLink<T>(): T | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return null;
    const encoded = hash.replace('#share=', '');
    const jsonStr = decodeURIComponent(atob(encoded));
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    console.warn("Invalid share link format", err);
    return null;
  }
}
export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Collaborative Link Copied", {
      description: "You can now share this forensic state with other advocates."
    });
  } catch (err) {
    toast.error("Failed to copy link");
  }
}