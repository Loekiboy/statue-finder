/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      src?: string;
      ar?: boolean;
      'ar-modes'?: string;
      'ar-scale'?: string;
      'camera-controls'?: boolean;
      'auto-rotate'?: boolean;
      'shadow-intensity'?: string;
      'ios-src'?: string;
      loading?: string;
      reveal?: string;
      'auto-rotate-delay'?: string;
      'rotation-per-second'?: string;
      poster?: string;
      'quick-look-browsers'?: string;
    }, HTMLElement>;
  }
}
