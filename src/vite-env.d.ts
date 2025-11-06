/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      src?: string;
      ar?: boolean;
      'ar-modes'?: string;
      'camera-controls'?: boolean;
      'auto-rotate'?: boolean;
    }, HTMLElement>;
  }
}
