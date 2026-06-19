import { useEffect, useLayoutEffect, useRef } from 'react';
import { GANTT_MAX_ZOOM_SCALE, GANTT_MIN_ZOOM_SCALE } from '../../../lib/constants.js';

export function useGanttEvents({
  containerRef,
  headerScrollRef,
  bodyScrollRef,
  verticalScrollRef,
  zoomScale,
  setZoomScale,
  setScrollState,
  displayMinTs,
  timelineWidth,
  displaySpanMs,
  getX,
  mappedLength
}) {
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const touchRef = useRef({
    mode: null,
    startX: 0,
    startScrollLeft: 0,
    startDistance: 0,
    startZoom: 1,
    anchorX: 0,
    anchorTime: 0,
  });
  const zoomScaleRef = useRef(zoomScale);
  const pendingZoomAnchorRef = useRef(null);
  const scrollRequestRef = useRef(null);

  const timelinePadLeft = 14;

  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);

  useEffect(() => {
    const updateSize = () => {
      if (!bodyScrollRef.current) return;
      setScrollState((prev) => ({
        ...prev,
        viewW: bodyScrollRef.current.clientWidth,
        viewH: verticalScrollRef.current?.clientHeight || 600,
      }));
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) observer.observe(containerRef.current);
    if (bodyScrollRef.current) observer.observe(bodyScrollRef.current);
    if (verticalScrollRef.current) observer.observe(verticalScrollRef.current);

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [containerRef, bodyScrollRef, verticalScrollRef, setScrollState]);

  useEffect(() => {
    const bodyViewport = bodyScrollRef.current;
    if (!bodyViewport) return;
    requestAnimationFrame(() => {
      bodyViewport.scrollLeft = 0;
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = 0;
      if (verticalScrollRef.current) verticalScrollRef.current.scrollTop = 0;
      setScrollState((prev) => ({ ...prev, left: 0, top: 0 }));
    });
  }, [mappedLength, bodyScrollRef, headerScrollRef, verticalScrollRef, setScrollState]);

  useEffect(() => {
    const viewport = bodyScrollRef.current;
    if (!viewport) return;

    const onWheel = (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const zoomIn = event.deltaY < 0;
      const nextZoom = Math.max(
        GANTT_MIN_ZOOM_SCALE,
        Math.min(GANTT_MAX_ZOOM_SCALE, zoomScaleRef.current * (zoomIn ? 1.15 : 0.87))
      );
      if (Math.abs(nextZoom - zoomScaleRef.current) < 0.001) return;

      const rect = viewport.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const absoluteX = viewport.scrollLeft + anchorX;
      const time = displayMinTs + ((absoluteX - timelinePadLeft) / timelineWidth) * displaySpanMs;

      pendingZoomAnchorRef.current = { anchorX, time };
      zoomScaleRef.current = nextZoom;
      setZoomScale(nextZoom);
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [timelineWidth, displaySpanMs, displayMinTs, bodyScrollRef, setZoomScale]);

  useLayoutEffect(() => {
    if (!pendingZoomAnchorRef.current || !bodyScrollRef.current) return;
    const { anchorX, time } = pendingZoomAnchorRef.current;
    const nextX = getX(time);
    bodyScrollRef.current.scrollLeft = nextX - anchorX;
    pendingZoomAnchorRef.current = null;
  }, [zoomScale, getX, bodyScrollRef]);

  const onBodyScroll = (event) => {
    const { scrollLeft } = event.currentTarget;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = scrollLeft;

    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState((prev) => ({ ...prev, left: scrollLeft }));
    });
  };

  const onVerticalScroll = (event) => {
    const { scrollTop } = event.currentTarget;
    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState((prev) => ({ ...prev, top: scrollTop }));
    });
  };

  const onDragStart = (event) => {
    if (!bodyScrollRef.current) return;
    dragRef.current = { active: true, startX: event.clientX, startScrollLeft: bodyScrollRef.current.scrollLeft };
  };

  const onDragMove = (event) => {
    if (!dragRef.current.active || !bodyScrollRef.current) return;
    bodyScrollRef.current.scrollLeft = dragRef.current.startScrollLeft - (event.clientX - dragRef.current.startX);
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
  };

  const onTouchStart = (event) => {
    if (!bodyScrollRef.current) return;

    if (event.touches.length >= 2) {
      const [touchA, touchB] = event.touches;
      const distance = Math.hypot(touchB.clientX - touchA.clientX, touchB.clientY - touchA.clientY);
      const rect = bodyScrollRef.current.getBoundingClientRect();
      const anchorX = ((touchA.clientX + touchB.clientX) / 2) - rect.left;
      const absoluteX = bodyScrollRef.current.scrollLeft + anchorX;
      const anchorTime = displayMinTs + ((absoluteX - timelinePadLeft) / timelineWidth) * displaySpanMs;

      touchRef.current = {
        mode: 'pinch',
        startX: 0,
        startScrollLeft: bodyScrollRef.current.scrollLeft,
        startDistance: Math.max(distance, 1),
        startZoom: zoomScaleRef.current,
        anchorX,
        anchorTime,
      };
    }
  };

  const onTouchMove = (event) => {
    if (!bodyScrollRef.current) return;

    if (touchRef.current.mode === 'pinch' && event.touches.length >= 2) {
      const [touchA, touchB] = event.touches;
      const distance = Math.hypot(touchB.clientX - touchA.clientX, touchB.clientY - touchA.clientY);
      const ratio = Math.max(0.5, Math.min(3, distance / Math.max(touchRef.current.startDistance, 1)));
      const nextZoom = Math.max(
        GANTT_MIN_ZOOM_SCALE,
        Math.min(GANTT_MAX_ZOOM_SCALE, touchRef.current.startZoom * ratio)
      );

      pendingZoomAnchorRef.current = {
        anchorX: touchRef.current.anchorX,
        time: touchRef.current.anchorTime,
      };
      zoomScaleRef.current = nextZoom;
      setZoomScale(nextZoom);
    }
  };

  const onTouchEnd = (event) => {
    if (event.touches.length < 2) {
      touchRef.current.mode = null;
    }
  };

  useEffect(() => () => {
    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
  }, []);

  return {
    onBodyScroll,
    onVerticalScroll,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}
