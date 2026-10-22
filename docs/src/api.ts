import api from 'virtual:feeef-api'
import dartApi, { files as dartFiles } from 'virtual:feeef-dart-api'
import type { ApiComponent } from '../plugins/api'

export type { ApiComponent, ApiProp } from '../plugins/api'

export const API = api as Record<string, ApiComponent>

/** The Flutter twin's widgets, read from `flutter/lib` (same shape, keyed by class name). */
export const DART_API = dartApi as Record<string, ApiComponent>

/**
 * The Dart file that mirrors a kit source file (`src/primitives/text-field.tsx` →
 * `flutter/lib/primitives/text_field.dart`), when the Flutter package has one.
 */
export function dartSourceFor(source: string): string | null {
  const path = `flutter/lib/${source.replace(/^src\//, '').replace(/\.tsx?$/, '').replace(/-/g, '_')}.dart`
  return (dartFiles as string[]).includes(path) ? path : null
}

/** Friendly names for the React DOM prop groups a component passes through. */
const INHERITED: Record<string, string> = {
  DOMAttributes: 'DOM event handlers',
  HTMLAttributes: 'Global HTML attributes',
  AriaAttributes: 'ARIA attributes',
  ButtonHTMLAttributes: '<button> attributes',
  InputHTMLAttributes: '<input> attributes',
  TextareaHTMLAttributes: '<textarea> attributes',
  FormHTMLAttributes: '<form> attributes',
  AnchorHTMLAttributes: '<a> attributes',
  ImgHTMLAttributes: '<img> attributes',
  DialogHTMLAttributes: '<dialog> attributes',
  LabelHTMLAttributes: '<label> attributes',
}

export const inheritedLabel = (from: string) => INHERITED[from] ?? 'Other inherited props'
