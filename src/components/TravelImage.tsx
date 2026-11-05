import { useState, type ImgHTMLAttributes } from 'react';
import { photoAsset, withoutFullWidth } from '@shared/photo-assets';

type TravelImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** A hero spanning the whole window: the only image that may load the 1920 px file. */
  fullWidth?: boolean;
};

/** Responsive variants and retries always retain photograph identity. */
export function TravelImage(props: TravelImageProps) {
  return <Photo key={props.src} {...props} />;
}

function Photo({ src, srcSet, sizes = '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw', alt, loading = 'lazy', decoding = 'async', style, onError, fullWidth = false, ...props }: TravelImageProps) {
  const [failure, setFailure] = useState<{ src: typeof src; stage: number }>({ src, stage: 0 });
  const stage = failure.src === src ? failure.stage : 0;
  const metadata = typeof src === 'string' ? photoAsset(src) : undefined;
  const responsive = srcSet ?? (fullWidth ? metadata?.srcSet : withoutFullWidth(metadata?.srcSet));
  const unavailable = src === '/images/photo-unavailable.svg' || stage > (responsive ? 1 : 0);
  const description = alt === '' ? '' : metadata?.alt ?? alt ?? '';
  return <img {...props} src={unavailable ? '/images/photo-unavailable.svg' : src}
    srcSet={!stage && !unavailable ? responsive : undefined} sizes={!stage && responsive && !unavailable ? sizes : undefined}
    alt={unavailable && description ? description + ': photograph unavailable' : description}
    loading={loading} decoding={decoding} data-image-state={unavailable ? 'unavailable' : stage ? 'source-retry' : 'ready'}
    style={{ objectPosition: metadata?.position, ...style, ...(unavailable ? { objectFit: 'contain' } : {}) }}
    onError={event => { onError?.(event); if (!unavailable) setFailure({ src, stage: stage + 1 }); }} />;
}
