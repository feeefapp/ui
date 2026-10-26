declare module 'virtual:feeef-api' {
  const api: Record<string, import('../plugins/api').ApiComponent>
  export default api
}
declare module 'virtual:feeef-dart-api' {
  const api: Record<string, import('../plugins/api').ApiComponent>
  export default api
  /** Every Dart file in flutter/lib, relative to the kit root. */
  export const files: string[]
}
declare module 'virtual:feeef-versions' {
  const versions: import('../plugins/versions').DocsVersions
  export default versions
}
