import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function rtlClass(rtlClass: string, ltrClass: string, isRTL: boolean) {
  return isRTL ? rtlClass : ltrClass
}
