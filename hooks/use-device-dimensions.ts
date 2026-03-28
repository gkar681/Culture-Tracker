import { useWindowDimensions } from 'react-native';

export function useDeviceDimensions() {
  const { width, height, scale, fontScale } = useWindowDimensions();

  return {
    width,
    height,
    scale,
    fontScale,
    isSmallDevice: width < 360,
  };
}

