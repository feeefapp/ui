import api from 'virtual:feeef-api'
import type { ApiComponent } from '../plugins/api'

export type { ApiComponent, ApiProp } from '../plugins/api'

export const API = api as Record<string, ApiComponent>

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
