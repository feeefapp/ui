/** Shared payload shapes for the Lab image studio. See docs/lab-image-studio.md. */
export type ImageOptions = Partial<Record<'aspectRatio' | 'size' | 'imageSize' | 'quality' | 'background' | 'outputFormat', string>>;
export type ImageOperation = 'generate' | 'edit' | 'inpaint' | 'variation' | 'upscale' | 'remove_bg' | 'expand';
export type ImageDocument = {
    v: 1;
    prompt: string;
    model?: string;
    options: ImageOptions;
    selectedTakeId?: string;
};
export type TakeStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ImageTake = {
    id: string;
    operation: ImageOperation;
    parentTakeId: string | null;
    status: TakeStatus;
    error: string | null;
    /** Stable failure code (Cloud/provider); the client shows a translated message when it knows it. */
    errorCode?: string | null;
    createdAt: string;
    starred: boolean;
    prompt: string;
    model: string;
    options: ImageOptions;
    referenceCount: number;
    hasMask: boolean;
    chargeDzd: string | null;
    /** What Cloud charged, in USD. */
    chargeUsd: number | null;
    /** `poster` for image landing pages, made in Poster mode. */
    kind: 'image' | 'poster';
    /** For posters: the copy Cloud wrote, reusable on a product page. */
    copy: {
        facts: string;
        copy: string;
    } | null;
    fileUrl: string;
    thumbUrl: string;
};
//# sourceMappingURL=types.d.ts.map