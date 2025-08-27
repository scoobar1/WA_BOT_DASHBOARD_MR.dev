declare module "qrcode" {
  interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: "low" | "medium" | "quartile" | "high";
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions
  ): Promise<string>;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeToDataURLOptions
  ): Promise<void>;
}
