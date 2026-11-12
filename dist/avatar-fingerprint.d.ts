/** Visual identity, not a security hash. Stable serialization makes object key order irrelevant. */
export declare function avatarKey(data: unknown): string;
/** The same data and rotation salt always return the same palette, orientation and pixel shading. */
export declare function voiceFingerprint(data: unknown, rotationSalt?: number): {
    key: string;
    rotation: number;
    colors: string[];
    pixels: {
        x: number;
        y: number;
        color: string;
        opacity: number;
    }[];
    width: number;
    height: number;
};
//# sourceMappingURL=avatar-fingerprint.d.ts.map