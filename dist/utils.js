import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/**
 * Merges class names with tailwind-merge
 *
 * This utility function combines the functionality of clsx and tailwind-merge
 * to handle class name conflicts properly when using Tailwind CSS.
 *
 * @param inputs - The class names to merge
 * @returns A string of merged class names
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
//# sourceMappingURL=utils.js.map