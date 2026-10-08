import { useState, type ImgHTMLAttributes } from 'react';
import photographs from '@shared/travel-photos.json';
import { imageRetries } from '@/lib/image-retries';
import { responsiveImage } from '@shared/responsive-image';

/** Keep the exact photograph, requesting appropriately sized Unsplash variants. */
export function TravelImage({ src, srcSet, sizes = '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw', loading = 'lazy', decoding = 'async', onError, className, style, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failure, setFailure] = useState<{ src: typeof src; stage: number }>({ src, stage: 0 });
  const stage = failure.src === src ? failure.stage : 0;
  const photo = photographs.find(item => item.image === src || item.original === src);
  const responsive = srcSet ?? (typeof src === 'string' ? responsiveImage(src) : undefined);
  const retries = imageRetries(src, responsive, photo?.original);
  const failed = stage > retries.length;
  return <img {...props} src={failed ? '/images/photo-unavailable.svg' : stage ? retries[stage - 1] : src}
    srcSet={stage ? undefined : responsive} sizes={responsive && !stage ? sizes : undefined}
    loading={loading} decoding={decoding} alt={failed ? `${alt ? `${alt}: ` : ''}photograph unavailable` : alt}
    data-image-state={failed ? 'failed' : stage ? retries[stage - 1] === src ? 'source-retry' : 'original-retry' : undefined}
    className={`${className ?? ''}${failed ? ' te-image-failed' : ''}`}
    style={{ objectPosition: photo?.position, ...style }}
    onError={event => { onError?.(event); if (!failed) setFailure({ src, stage: stage + 1 }); }} />;
}
